use std::collections::{HashMap, HashSet};

use rand::Rng;
use rand_distr::{Distribution, Normal};

use crate::data::{points_for, race_by_id, team_by_name, TEAMS};
use crate::error::SimError;
use crate::strategy::{build_pit_lap_set, generate_rival_stints, score_strategy};
use crate::tyre::{calculate_tyre_delta, fresh_tyre_out_lap_penalty};
use crate::types::{
    CarSnapshot, Compound, FastestLap, LapSnapshot, Race, RaceMeta, RaceResult, RaceStats,
    SimConfig, Stint, Weather,
};

const BASE_LAP: f64 = 90.0;
const DIRTY_AIR_WINDOW: f64 = 1.2;
const DIRTY_AIR_PENALTY: f64 = 0.18;
const DRS_BONUS: f64 = -0.22;

fn traffic_delta(interval: f64, has_drs: bool, overtake_factor: f64) -> f64 {
    let passing = overtake_factor.clamp(0.0, 1.0);
    if has_drs {
        DRS_BONUS * (0.5 + passing)
    } else if interval > 0.0 && interval < DIRTY_AIR_WINDOW {
        DIRTY_AIR_PENALTY * (1.5 - passing)
    } else {
        0.0
    }
}

fn race_tyre_delta(
    compound: Compound,
    tyre_age: u16,
    track_deg: f64,
    deg_resistance: f64,
    is_out_lap: bool,
) -> f64 {
    let out_lap_penalty = if is_out_lap {
        fresh_tyre_out_lap_penalty(compound)
    } else {
        0.0
    };
    calculate_tyre_delta(compound, tyre_age, track_deg, deg_resistance) + out_lap_penalty
}

fn rival_pit_compound(
    planned_compound: Compound,
    weather: Weather,
    is_raining: bool,
) -> Compound {
    match (is_raining, weather) {
        (true, Weather::Mixed) => Compound::Inter,
        (true, Weather::Wet) => Compound::Wet,
        _ => planned_compound,
    }
}

#[derive(Clone)]
struct CarPlan {
    id: u8,
    driver: String,
    team: String,
    color: String,
    pace: f64,
    qualifying_score: f64,
    deg_resistance: f64,
    is_user: bool,
    is_lead: bool,
    is_teammate: bool,
    stints: Vec<Stint>,
    grid_pos: u8,
}

struct TrafficState {
    interval: f64,
    drs: bool,
}

pub fn simulate_once(config: &SimConfig, rng: &mut impl Rng) -> Result<RaceResult, SimError> {
    config.validate()?;
    let race = race_by_id(config.race_id)
        .ok_or_else(|| SimError::InvalidConfig(format!("Unknown race_id: {}", config.race_id)))?;
    let team = team_by_name(&config.team).ok_or_else(|| {
        SimError::InvalidConfig(format!("Unknown team: {}", config.team))
    })?;

    let total_stint_laps: u16 = config.stints.iter().map(|s| s.laps).sum();
    if (i32::from(total_stint_laps) - i32::from(race.laps)).abs() > 3 {
        return Err(SimError::InvalidConfig(format!(
            "Stint laps total {total_stint_laps} but race has {} laps",
            race.laps
        )));
    }

    let mut cars = assemble_grid(config, &race, rng)?;
    assign_unique_grid(&mut cars, config.grid_position);

    let sc_prob = race.sc_prob + if config.safety_car_expected { 0.15 } else { 0.0 };
    let has_sc = rng.gen::<f64>() < sc_prob;
    let sc_lap = if has_sc {
        let lo = (f64::from(race.laps) * 0.2).round() as u16;
        let hi = (f64::from(race.laps) * 0.75).round() as u16;
        Some(rng.gen_range(lo.max(1)..=hi.max(2)))
    } else {
        None
    };
    let sc_dur: u16 = if has_sc { rng.gen_range(3..=7) } else { 0 };

    let rain_lap = match config.weather {
        Weather::Wet => Some(1),
        Weather::Mixed if rng.gen::<f64>() < 0.5 => {
            let lo = (f64::from(race.laps) * 0.3).round() as u16;
            let hi = (f64::from(race.laps) * 0.7).round() as u16;
            Some(rng.gen_range(lo.max(1)..=hi.max(2)))
        }
        _ => None,
    };

    let mut cum_times: HashMap<u8, f64> = cars
        .iter()
        .map(|c| (c.id, f64::from(c.grid_pos) * 0.15))
        .collect();
    let mut stint_idx: HashMap<u8, usize> = cars.iter().map(|c| (c.id, 0)).collect();
    let mut stint_lap: HashMap<u8, u16> = cars.iter().map(|c| (c.id, 0)).collect();
    let mut active_compounds: HashMap<u8, Compound> = cars
        .iter()
        .map(|car| (car.id, car.stints[0].compound))
        .collect();
    let mut traffic: HashMap<u8, TrafficState> = cars
        .iter()
        .map(|c| {
            (
                c.id,
                TrafficState {
                    interval: f64::from(c.grid_pos.saturating_sub(1)) * 0.15,
                    drs: false,
                },
            )
        })
        .collect();

    let mut pit_schedules: HashMap<u8, HashSet<u16>> = HashMap::new();
    for car in &cars {
        let jitter = if car.is_lead { 0 } else { rng.gen_range(-3..=3) };
        pit_schedules.insert(
            car.id,
            build_pit_lap_set(&car.stints, jitter).into_iter().collect(),
        );
    }
    let mut out_lap_pending: HashSet<u8> = HashSet::new();
    let mut weather_pitted: HashSet<u8> = HashSet::new();

    let mut fastest_lap = FastestLap {
        time: 999.9,
        driver: String::new(),
        lap: 0,
    };
    let mut lap_snapshots = Vec::with_capacity(race.laps as usize);
    let lap_noise = Normal::new(0.0, 0.08).expect("valid normal");
    let sc_noise = Normal::new(0.0, 0.3).expect("valid normal");

    for lap in 1..=race.laps {
        let in_sc = has_sc
            && sc_lap.is_some_and(|start| lap >= start && lap <= start + sc_dur);
        let is_rain = rain_lap.is_some_and(|start| lap >= start);
        let mut lap_cars = Vec::with_capacity(cars.len());

        for car in &cars {
            let age = {
                let slot = stint_lap.get_mut(&car.id).expect("stint age");
                *slot = slot.saturating_add(1);
                *slot
            };
            let idx = (*stint_idx.get(&car.id).expect("stint idx")).min(car.stints.len() - 1);
            let compound = *active_compounds.get(&car.id).expect("active compound");
            let tyre_delta =
                calculate_tyre_delta(compound, age, race.deg, car.deg_resistance);
            let timing_tyre_delta = race_tyre_delta(
                compound,
                age,
                race.deg,
                car.deg_resistance,
                out_lap_pending.remove(&car.id),
            );
            let out_lap_penalty = timing_tyre_delta - tyre_delta;

            let mut rain_penalty = 0.0;
            if is_rain && !matches!(compound, Compound::Inter | Compound::Wet) {
                rain_penalty = rng.gen_range(2.0..5.5);
            }

            let mut driver_error = 0.0;
            if !in_sc && lap > 1 && rng.gen::<f64>() < 0.012 {
                driver_error = rng.gen_range(0.4..1.8);
            }

            let base_lap = BASE_LAP * car.pace;
            let mut lap_time = if in_sc {
                base_lap * 1.28 + out_lap_penalty + sc_noise.sample(rng)
            } else {
                base_lap
                    + timing_tyre_delta
                    + rain_penalty
                    + driver_error
                    + lap_noise.sample(rng)
            };

            if !in_sc && lap > 1 {
                if let Some(prev) = traffic.get(&car.id) {
                    lap_time += traffic_delta(prev.interval, prev.drs, race.overtake);
                }
            }

            let mut pitting = false;
            let is_scheduled_pit = pit_schedules
                .get(&car.id)
                .is_some_and(|set| set.contains(&lap));
            let is_weather_pit = is_rain
                && !car.is_lead
                && !matches!(compound, Compound::Inter | Compound::Wet)
                && !weather_pitted.contains(&car.id);
            if is_scheduled_pit || is_weather_pit {
                let pit_loss = if in_sc {
                    7.0 + rng.gen_range(0.0..2.0)
                } else {
                    20.5 + rng.gen_range(0.0..1.8)
                };
                *cum_times.get_mut(&car.id).expect("cum") += pit_loss;
                let next = if is_scheduled_pit {
                    (*stint_idx.get(&car.id).expect("idx") + 1).min(car.stints.len() - 1)
                } else {
                    idx
                };
                stint_idx.insert(car.id, next);
                stint_lap.insert(car.id, 0);
                let planned_compound = car.stints[next].compound;
                let next_compound = if car.is_lead {
                    planned_compound
                } else {
                    // Scheduled stops must stay weather-aware or rivals would revert to dry tyres.
                    rival_pit_compound(planned_compound, config.weather, is_rain)
                };
                active_compounds.insert(car.id, next_compound);
                out_lap_pending.insert(car.id);
                if is_weather_pit {
                    weather_pitted.insert(car.id);
                }
                pitting = true;
            }

            *cum_times.get_mut(&car.id).expect("cum") += lap_time;

            if lap_time < fastest_lap.time && lap > 5 && !in_sc {
                fastest_lap = FastestLap {
                    time: round3(lap_time),
                    driver: car.driver.clone(),
                    lap,
                };
            }

            let post_compound = *active_compounds.get(&car.id).expect("active compound");
            let post_age = *stint_lap.get(&car.id).expect("age");

            lap_cars.push(CarSnapshot {
                id: car.id,
                driver: car.driver.clone(),
                team: car.team.clone(),
                color: car.color.clone(),
                is_user: car.is_user,
                is_lead: car.is_lead,
                is_teammate: car.is_teammate,
                grid_pos: car.grid_pos,
                cum_time: round3(*cum_times.get(&car.id).expect("cum")),
                lap_time: round3(lap_time),
                compound: post_compound,
                tyre_age: post_age,
                tyre_delta: round4(tyre_delta),
                pitting,
                rain_pen: round3(rain_penalty),
                error: round3(driver_error),
                position: 0,
                gap: 0.0,
                interval: 0.0,
                drs: false,
            });
        }

        lap_cars.sort_by(|a, b| a.cum_time.partial_cmp(&b.cum_time).expect("times"));
        let leader_time = lap_cars[0].cum_time;
        let times: Vec<f64> = lap_cars.iter().map(|c| c.cum_time).collect();
        for (i, car) in lap_cars.iter_mut().enumerate() {
            car.position = (i + 1) as u8;
            car.gap = round3(car.cum_time - leader_time);
            if i == 0 {
                car.interval = 0.0;
                car.drs = false;
            } else {
                car.interval = round3(times[i] - times[i - 1]);
                car.drs = !in_sc && lap > 2 && car.interval < 1.0;
            }
            traffic.insert(
                car.id,
                TrafficState {
                    interval: car.interval,
                    drs: car.drs,
                },
            );
        }

        lap_snapshots.push(LapSnapshot {
            lap,
            in_sc,
            is_raining: is_rain,
            sc_lap,
            fastest_lap: fastest_lap.clone(),
            cars: lap_cars,
        });
    }

    let final_snap = lap_snapshots.last().expect("laps");
    let lead = final_snap
        .cars
        .iter()
        .find(|c| c.is_lead)
        .ok_or_else(|| SimError::InvalidConfig("Lead driver missing from result".into()))?;
    let user_positions: Vec<u8> = final_snap
        .cars
        .iter()
        .filter(|c| c.is_user)
        .map(|c| c.position)
        .collect();
    let avg_pos = if user_positions.is_empty() {
        20.0
    } else {
        f64::from(user_positions.iter().map(|p| u16::from(*p)).sum::<u16>())
            / user_positions.len() as f64
    };
    let team_points: u16 = user_positions.iter().copied().map(points_for).sum();

    Ok(RaceResult {
        meta: RaceMeta {
            race: race.clone(),
            team: team.name.to_string(),
            team_color: team.color.to_string(),
            stints: config.stints.clone(),
            grid: config.grid_position,
            weather: config.weather,
            has_sc,
            sc_lap,
            sc_dur,
            rain_lap,
            total_laps: race.laps,
        },
        stats: RaceStats {
            final_position: lead.position,
            points_scored: points_for(lead.position),
            team_points,
            avg_position: (avg_pos * 10.0).round() / 10.0,
            gap_to_winner: lead.gap,
            fastest_lap,
            practicality: (score_strategy(&config.stints, &race, avg_pos, config.grid_position)
                * 10.0)
                .round()
                / 10.0,
        },
        laps: lap_snapshots,
    })
}

fn assemble_grid(
    config: &SimConfig,
    race: &Race,
    rng: &mut impl Rng,
) -> Result<Vec<CarPlan>, SimError> {
    let user_team = team_by_name(&config.team).expect("validated");
    let mut cars = Vec::with_capacity(20);
    let mut next_id: u8 = 0;
    let pace_noise = Normal::new(0.0, 0.003).expect("valid normal");
    let qualifying_noise = Normal::new(0.0, 0.0005).expect("valid normal");

    cars.push(CarPlan {
        id: next_id,
        driver: user_team.drivers[0].to_string(),
        team: user_team.name.to_string(),
        color: user_team.color.to_string(),
        pace: user_team.race_pace,
        qualifying_score: user_team.qual_gap,
        deg_resistance: user_team.deg_resistance,
        is_user: true,
        is_lead: true,
        is_teammate: false,
        stints: config.stints.clone(),
        grid_pos: config.grid_position,
    });
    next_id += 1;

    let teammate_stops = stop_count(rng, race.deg > 0.7);
    cars.push(CarPlan {
        id: next_id,
        driver: user_team.drivers[1].to_string(),
        team: user_team.name.to_string(),
        color: user_team.color.to_string(),
        pace: user_team.race_pace + 0.002,
        qualifying_score: user_team.qual_gap + 0.002 + qualifying_noise.sample(rng),
        deg_resistance: user_team.deg_resistance,
        is_user: true,
        is_lead: false,
        is_teammate: true,
        stints: generate_rival_stints(race, teammate_stops, rng),
        grid_pos: 0,
    });
    next_id += 1;

    for team in TEAMS {
        if team.name == user_team.name {
            continue;
        }
        for d_idx in 0..2 {
            let rival_stops = stop_count(rng, race.deg > 0.7);
            cars.push(CarPlan {
                id: next_id,
                driver: team.drivers[d_idx].to_string(),
                team: team.name.to_string(),
                color: team.color.to_string(),
                pace: team.race_pace + f64::from(d_idx as u8) * 0.002 + pace_noise.sample(rng),
                qualifying_score: team.qual_gap
                    + f64::from(d_idx as u8) * 0.002
                    + qualifying_noise.sample(rng),
                deg_resistance: team.deg_resistance,
                is_user: false,
                is_lead: false,
                is_teammate: false,
                stints: generate_rival_stints(race, rival_stops, rng),
                grid_pos: 0,
            });
            next_id += 1;
        }
    }

    if cars.len() != 20 {
        return Err(SimError::InvalidConfig(format!(
            "Expected 20 cars, built {}",
            cars.len()
        )));
    }
    Ok(cars)
}

fn stop_count(rng: &mut impl Rng, high_deg: bool) -> usize {
    if high_deg {
        if rng.gen_range(0..3) < 2 {
            1
        } else {
            2
        }
    } else if rng.gen::<bool>() {
        1
    } else {
        2
    }
}

fn assign_unique_grid(cars: &mut [CarPlan], lead_grid: u8) {
    let lead_slot = (lead_grid.clamp(1, 20) - 1) as usize;
    let mut slots: [Option<usize>; 20] = [None; 20];
    slots[lead_slot] = Some(0);

    let mut others: Vec<usize> = (1..cars.len()).collect();
    others.sort_by(|a, b| {
        cars[*a]
            .qualifying_score
            .partial_cmp(&cars[*b].qualifying_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut slot = 0usize;
    for idx in others {
        while slot < 20 && slots[slot].is_some() {
            slot += 1;
        }
        if slot < 20 {
            slots[slot] = Some(idx);
        }
    }

    for (pos, idx) in slots.into_iter().enumerate() {
        if let Some(idx) = idx {
            cars[idx].grid_pos = (pos + 1) as u8;
        }
    }
}

fn round3(v: f64) -> f64 {
    (v * 1000.0).round() / 1000.0
}

fn round4(v: f64) -> f64 {
    (v * 10_000.0).round() / 10_000.0
}

#[cfg(test)]
mod tests {
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    use super::*;
    use crate::types::{Compound, Weather};

    fn sample_config() -> SimConfig {
        SimConfig {
            race_id: 5,
            team: "McLaren".into(),
            grid_position: 2,
            weather: Weather::Dry,
            safety_car_expected: false,
            iterations: 1,
            seed: Some(1),
            stints: vec![
                Stint { compound: Compound::Medium, laps: 22 },
                Stint { compound: Compound::Hard, laps: 26 },
                Stint { compound: Compound::Soft, laps: 18 },
            ],
        }
    }

    #[test]
    fn race_has_expected_lap_count_and_field() {
        let cfg = sample_config();
        let mut rng = StdRng::seed_from_u64(7);
        let result = simulate_once(&cfg, &mut rng).expect("sim");
        assert_eq!(result.laps.len(), 66);
        let final_cars = &result.laps.last().expect("final").cars;
        let positions: Vec<u8> = final_cars.iter().map(|c| c.position).collect();
        assert_eq!(positions, (1..=20).collect::<Vec<_>>());
        assert_eq!(final_cars[0].interval, 0.0);
        assert!(!final_cars[0].drs);
        let gaps: Vec<f64> = final_cars.iter().map(|c| c.gap).collect();
        let mut sorted = gaps.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert_eq!(gaps, sorted);
        assert!(result.laps.iter().all(|lap| {
            lap.cars.iter().all(|c| (0.0..=2.0).contains(&c.error) && c.interval >= 0.0)
        }));
    }

    #[test]
    fn lead_driver_starts_on_requested_grid() {
        let cfg = sample_config();
        let mut rng = StdRng::seed_from_u64(11);
        let result = simulate_once(&cfg, &mut rng).expect("sim");
        let first = &result.laps[0];
        let lead = first.cars.iter().find(|c| c.is_lead).expect("lead");
        assert_eq!(lead.driver, "PIASTRI");
        assert_eq!(lead.grid_pos, 2);
    }

    #[test]
    fn rejects_unknown_team() {
        let mut cfg = sample_config();
        cfg.team = "Not A Team".into();
        let mut rng = StdRng::seed_from_u64(1);
        let err = simulate_once(&cfg, &mut rng).unwrap_err();
        assert!(err.to_string().contains("Unknown team"));
    }

    #[test]
    fn same_seed_is_deterministic() {
        let cfg = sample_config();
        let a = simulate_once(&cfg, &mut StdRng::seed_from_u64(42)).unwrap();
        let b = simulate_once(&cfg, &mut StdRng::seed_from_u64(42)).unwrap();
        assert_eq!(a.stats.final_position, b.stats.final_position);
        assert_eq!(a.laps[10].cars[0].cum_time, b.laps[10].cars[0].cum_time);
    }

    #[test]
    fn traffic_effect_scales_with_track_overtaking() {
        let low_passing_dirty_air = traffic_delta(0.8, false, 0.1);
        let high_passing_dirty_air = traffic_delta(0.8, false, 0.65);
        let low_passing_drs = traffic_delta(0.8, true, 0.1);
        let high_passing_drs = traffic_delta(0.8, true, 0.65);

        assert!(low_passing_dirty_air > high_passing_dirty_air + 0.05);
        assert!(high_passing_drs < low_passing_drs - 0.05);
    }

    #[test]
    fn race_tyre_delta_applies_penalty_only_on_out_lap() {
        let compound = Compound::Hard;
        let baseline = calculate_tyre_delta(compound, 1, 0.8, 0.82);
        let out_lap = race_tyre_delta(compound, 1, 0.8, 0.82, true);
        let following_lap = race_tyre_delta(compound, 2, 0.8, 0.82, false);

        assert_eq!(
            out_lap,
            baseline + fresh_tyre_out_lap_penalty(compound)
        );
        assert_eq!(
            following_lap,
            calculate_tyre_delta(compound, 2, 0.8, 0.82)
        );
    }

    #[test]
    fn rival_pit_compound_matches_active_weather() {
        assert_eq!(
            rival_pit_compound(Compound::Soft, Weather::Mixed, true),
            Compound::Inter
        );
        assert_eq!(
            rival_pit_compound(Compound::Medium, Weather::Wet, true),
            Compound::Wet
        );
        assert_eq!(
            rival_pit_compound(Compound::Hard, Weather::Wet, false),
            Compound::Hard
        );
    }

    #[test]
    fn rival_grid_uses_seeded_qualifying_gap() {
        let mut cfg = sample_config();
        cfg.team = "Red Bull".into();
        cfg.grid_position = 20;
        let race = race_by_id(cfg.race_id).expect("race");

        let grid_for_seed = |seed| {
            let mut rng = StdRng::seed_from_u64(seed);
            let mut cars = assemble_grid(&cfg, &race, &mut rng).expect("grid");
            assign_unique_grid(&mut cars, cfg.grid_position);
            cars.sort_by_key(|car| car.grid_pos);
            cars.into_iter()
                .map(|car| (car.driver, car.grid_pos))
                .collect::<Vec<_>>()
        };

        let first = grid_for_seed(3);
        let repeated = grid_for_seed(3);
        let best_grid = |team: &str| {
            first
                .iter()
                .filter(|(driver, _)| {
                    TEAMS
                        .iter()
                        .find(|record| record.drivers.contains(&driver.as_str()))
                        .is_some_and(|record| record.name == team)
                })
                .map(|(_, grid_pos)| *grid_pos)
                .min()
                .expect("team on grid")
        };

        assert_eq!(first, repeated);
        assert!(best_grid("McLaren") < best_grid("Ferrari"));
    }

    #[test]
    fn rivals_switch_once_to_wets_when_rain_begins() {
        let mut cfg = sample_config();
        cfg.weather = Weather::Wet;
        let result = simulate_once(&cfg, &mut StdRng::seed_from_u64(29)).expect("wet race");
        let rain_lap = &result.laps[0];

        assert!(rain_lap.is_raining);
        assert!(rain_lap
            .cars
            .iter()
            .filter(|car| !car.is_lead)
            .all(|car| car.pitting && car.compound == Compound::Wet));

        let lead = rain_lap.cars.iter().find(|car| car.is_lead).expect("lead");
        assert!(!lead.pitting);
        assert_eq!(lead.compound, Compound::Medium);
        assert!(result.laps[1]
            .cars
            .iter()
            .filter(|car| !car.is_lead)
            .all(|car| !car.pitting));
    }

    #[test]
    fn rivals_switch_to_inters_in_mixed_weather_without_changing_user_strategy() {
        let mut cfg = sample_config();
        cfg.weather = Weather::Mixed;
        let result = simulate_once(&cfg, &mut StdRng::seed_from_u64(29)).expect("mixed race");
        let rain_lap = result.meta.rain_lap.expect("seed produces rain");
        let rain_snapshot = &result.laps[usize::from(rain_lap - 1)];

        assert!(rain_snapshot
            .cars
            .iter()
            .filter(|car| !car.is_lead)
            .all(|car| car.pitting && car.compound == Compound::Inter));

        let lead_pit_laps = result
            .laps
            .iter()
            .filter(|lap| lap.cars.iter().any(|car| car.is_lead && car.pitting))
            .map(|lap| lap.lap)
            .collect::<Vec<_>>();
        assert_eq!(lead_pit_laps, vec![22, 48]);
        assert!(result.laps.iter().all(|lap| {
            lap.cars
                .iter()
                .find(|car| car.is_lead)
                .is_some_and(|car| !matches!(car.compound, Compound::Inter | Compound::Wet))
        }));
    }
}
