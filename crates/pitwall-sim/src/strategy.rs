use rand::Rng;

use crate::tyre::params;
use crate::types::{Compound, Race, Stint};

pub fn generate_rival_stints(race: &Race, stop_count: usize, rng: &mut impl Rng) -> Vec<Stint> {
    let compound_pool: &[Compound] = if race.deg > 0.75 {
        &[Compound::Medium, Compound::Hard, Compound::Medium]
    } else {
        &[Compound::Soft, Compound::Medium, Compound::Hard]
    };

    let mut stints = Vec::new();
    let mut remaining = i32::from(race.laps);
    let stint_count = stop_count + 1;

    for i in 0..stint_count {
        if remaining <= 0 {
            break;
        }
        let is_last = i == stop_count;
        let jitter: i32 = rng.gen_range(-6..=6);
        let even_split = i32::from(race.laps) / stint_count as i32;
        let stint_laps = if is_last {
            remaining
        } else {
            (even_split + jitter).max(8)
        };
        let laps = stint_laps.min(remaining) as u16;
        stints.push(Stint {
            compound: compound_pool[i % compound_pool.len()],
            laps,
        });
        remaining -= i32::from(laps);
    }

    if remaining > 0 {
        if let Some(last) = stints.last_mut() {
            last.laps += remaining as u16;
        }
    }

    stints
}

pub fn build_pit_lap_set(stints: &[Stint], jitter: i32) -> Vec<u16> {
    let mut pit_laps = Vec::new();
    let mut cumulative = 0i32;
    if stints.len() < 2 {
        return pit_laps;
    }
    for stint in &stints[..stints.len() - 1] {
        cumulative += i32::from(stint.laps);
        let pit_lap = (cumulative + jitter).max(3) as u16;
        pit_laps.push(pit_lap);
    }
    pit_laps
}

pub fn score_strategy(stints: &[Stint], race: &Race, avg_pos: f64, grid: u8) -> f64 {
    let mut score = 100.0;

    for stint in stints {
        let model = params(stint.compound);
        if stint.laps > model.cliff {
            score -= f64::from(stint.laps - model.cliff) * 1.5;
        }
        if stint.compound == Compound::Soft && stint.laps > 20 && race.deg > 0.75 {
            score -= 18.0;
        }
    }

    let stop_count = stints.len().saturating_sub(1);
    if race.deg > 0.80 && stop_count < 2 {
        score -= 22.0;
    }
    if race.deg < 0.40 && stop_count > 1 {
        score -= 14.0;
    }

    let positions_to_gain = (f64::from(grid) - avg_pos).max(0.0);
    let overtake_difficulty = 1.0 - race.overtake;
    score -= positions_to_gain * overtake_difficulty * 1.5;

    score.clamp(0.0, 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::race_by_id;

    #[test]
    fn pit_laps_are_cumulative_stint_ends() {
        let stints = vec![
            Stint { compound: Compound::Medium, laps: 22 },
            Stint { compound: Compound::Hard, laps: 26 },
            Stint { compound: Compound::Soft, laps: 18 },
        ];
        assert_eq!(build_pit_lap_set(&stints, 0), vec![22, 48]);
    }

    #[test]
    fn pit_jitter_cannot_go_before_lap_three() {
        let stints = vec![
            Stint { compound: Compound::Soft, laps: 4 },
            Stint { compound: Compound::Hard, laps: 20 },
        ];
        assert_eq!(build_pit_lap_set(&stints, -8), vec![3]);
    }

    #[test]
    fn high_deg_one_stop_is_penalised() {
        let race = race_by_id(3).expect("bahrain gp");
        let stints = vec![
            Stint { compound: Compound::Medium, laps: 33 },
            Stint { compound: Compound::Hard, laps: 33 },
        ];
        let score = score_strategy(&stints, &race, 8.0, 8);
        assert!(score < 90.0);
    }

    #[test]
    fn points_table_awards_twenty_five_for_win() {
        assert_eq!(crate::data::points_for(1), 25);
        assert_eq!(crate::data::points_for(10), 1);
        assert_eq!(crate::data::points_for(11), 0);
    }
}
