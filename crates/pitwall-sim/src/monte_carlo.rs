use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::error::SimError;
use crate::race::simulate_once;
use crate::types::{MonteCarloReport, SimConfig, SimResponse};

const MAX_ITERATIONS: u32 = 2000;

pub fn simulate_many(config: &SimConfig) -> Result<SimResponse, SimError> {
    config.validate()?;
    let iterations = config.iterations.clamp(1, MAX_ITERATIONS);
    let seed = config.seed.unwrap_or_else(|| rand::thread_rng().gen());

    let mut positions: Vec<u8> = Vec::with_capacity(iterations as usize);
    let mut points: Vec<u16> = Vec::with_capacity(iterations as usize);
    let mut sc_hits = 0u32;
    let mut rain_hits = 0u32;

    for i in 0..iterations {
        let mut rng = StdRng::seed_from_u64(seed.wrapping_add(u64::from(i)));
        let result = simulate_once(config, &mut rng)?;
        positions.push(result.stats.final_position);
        points.push(result.stats.points_scored);
        if result.meta.has_sc {
            sc_hits += 1;
        }
        if result.meta.rain_lap.is_some() {
            rain_hits += 1;
        }
    }

    let mut sorted = positions.clone();
    sorted.sort_unstable();
    let median = percentile(&sorted, 0.50);
    let p05 = percentile(&sorted, 0.05);
    let p95 = percentile(&sorted, 0.95);

    let mut histogram = vec![0u32; 20];
    let mut wins = 0u32;
    let mut podiums = 0u32;
    let mut in_points = 0u32;
    for pos in &positions {
        let idx = usize::from(pos.saturating_sub(1)).min(19);
        histogram[idx] += 1;
        if *pos == 1 {
            wins += 1;
        }
        if *pos <= 3 {
            podiums += 1;
        }
        if *pos <= 10 {
            in_points += 1;
        }
    }

    let n = f64::from(iterations);
    let expected_points = points.iter().map(|p| f64::from(*p)).sum::<f64>() / n;

    let representative_idx = positions
        .iter()
        .enumerate()
        .min_by_key(|(i, pos)| {
            let dist = i32::from(**pos) - i32::from(median);
            (dist.unsigned_abs(), *i as u32)
        })
        .map(|(i, _)| i as u32)
        .unwrap_or(0);

    let mut playback_rng =
        StdRng::seed_from_u64(seed.wrapping_add(u64::from(representative_idx)));
    let playback = simulate_once(config, &mut playback_rng)?;

    Ok(SimResponse {
        playback,
        monte_carlo: MonteCarloReport {
            iterations,
            seed,
            position_histogram: histogram,
            expected_points: (expected_points * 100.0).round() / 100.0,
            p_win: wins as f64 / n,
            p_podium: podiums as f64 / n,
            p_points: in_points as f64 / n,
            sc_rate: f64::from(sc_hits) / n,
            rain_rate: f64::from(rain_hits) / n,
            median_position: median,
            p05_position: p05,
            p95_position: p95,
        },
        seed,
    })
}

fn percentile(sorted: &[u8], p: f64) -> u8 {
    if sorted.is_empty() {
        return 20;
    }
    let idx = ((sorted.len() as f64 - 1.0) * p).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Compound, Stint, Weather};

    fn sample_config(iterations: u32, seed: u64) -> SimConfig {
        SimConfig {
            race_id: 5,
            team: "McLaren".into(),
            grid_position: 2,
            weather: Weather::Dry,
            safety_car_expected: false,
            iterations,
            seed: Some(seed),
            stints: vec![
                Stint { compound: Compound::Medium, laps: 22 },
                Stint { compound: Compound::Hard, laps: 26 },
                Stint { compound: Compound::Soft, laps: 18 },
            ],
        }
    }

    #[test]
    fn histogram_counts_sum_to_iterations() {
        let cfg = sample_config(40, 99);
        let result = simulate_many(&cfg).expect("mc");
        let sum: u32 = result.monte_carlo.position_histogram.iter().sum();
        assert_eq!(sum, 40);
        assert_eq!(result.monte_carlo.iterations, 40);
        assert_eq!(result.monte_carlo.position_histogram.len(), 20);
        assert!(result.monte_carlo.median_position >= 1);
        assert!(result.monte_carlo.p05_position <= result.monte_carlo.p95_position);
    }

    #[test]
    fn playback_finish_is_near_median() {
        let cfg = sample_config(30, 123);
        let result = simulate_many(&cfg).expect("mc");
        let finish = result.playback.stats.final_position;
        let median = result.monte_carlo.median_position;
        let dist = i32::from(finish) - i32::from(median);
        assert!(dist.abs() <= 3, "finish {finish} vs median {median}");
    }

    #[test]
    fn same_seed_reproduces_monte_carlo() {
        let cfg = sample_config(20, 7);
        let a = simulate_many(&cfg).unwrap();
        let b = simulate_many(&cfg).unwrap();
        assert_eq!(a.monte_carlo.position_histogram, b.monte_carlo.position_histogram);
        assert_eq!(a.playback.stats.final_position, b.playback.stats.final_position);
    }
}
