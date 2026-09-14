use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::error::SimError;
use crate::race::simulate_once;
use crate::types::{MonteCarloReport, SimConfig, SimResponse, MAX_SAFE_SEED};

pub const QUICK_ITERATIONS: u32 = 500;
pub const DEFAULT_ITERATIONS: u32 = 2_000;
pub const HIGH_CONFIDENCE_ITERATIONS: u32 = 5_000;
const WILSON_95_Z_SCORE: f64 = 1.959_963_984_540_054;

pub fn simulate_many(config: &SimConfig) -> Result<SimResponse, SimError> {
    config.validate()?;
    let iterations = clamp_iterations(config.iterations);
    let seed = config
        .seed
        .unwrap_or_else(|| generate_seed(&mut rand::thread_rng()));

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
    let median = percentile_position(&sorted, 0.50);
    let p05 = percentile_position(&sorted, 0.05);
    let p95 = percentile_position(&sorted, 0.95);
    let (position_std_dev, position_iqr) = position_dispersion(&sorted);

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
    let p_win = f64::from(wins) / n;
    let p_podium = f64::from(podiums) / n;
    let p_points = f64::from(in_points) / n;
    let (p_win_ci_low, p_win_ci_high) = wilson_interval(wins, iterations);
    let (p_podium_ci_low, p_podium_ci_high) = wilson_interval(podiums, iterations);
    let (p_points_ci_low, p_points_ci_high) = wilson_interval(in_points, iterations);

    let representative_idx = positions
        .iter()
        .enumerate()
        .min_by_key(|(i, pos)| {
            let dist = i32::from(**pos) - i32::from(median);
            (dist.unsigned_abs(), *i as u32)
        })
        .map(|(i, _)| i as u32)
        .unwrap_or(0);

    let mut playback_rng = StdRng::seed_from_u64(seed.wrapping_add(u64::from(representative_idx)));
    let playback = simulate_once(config, &mut playback_rng)?;

    Ok(SimResponse {
        playback,
        monte_carlo: MonteCarloReport {
            iterations,
            seed,
            position_histogram: histogram,
            expected_points: (expected_points * 100.0).round() / 100.0,
            p_win,
            p_win_ci_low,
            p_win_ci_high,
            p_podium,
            p_podium_ci_low,
            p_podium_ci_high,
            p_points,
            p_points_ci_low,
            p_points_ci_high,
            sc_rate: f64::from(sc_hits) / n,
            rain_rate: f64::from(rain_hits) / n,
            median_position: median,
            p05_position: p05,
            p95_position: p95,
            position_std_dev,
            position_iqr,
        },
        seed,
    })
}

fn generate_seed(rng: &mut impl Rng) -> u64 {
    rng.gen_range(0..=MAX_SAFE_SEED)
}

fn clamp_iterations(iterations: u32) -> u32 {
    iterations.clamp(1, HIGH_CONFIDENCE_ITERATIONS)
}

fn wilson_interval(successes: u32, trials: u32) -> (f64, f64) {
    if trials == 0 {
        return (0.0, 1.0);
    }

    let n = f64::from(trials);
    let estimate = f64::from(successes.min(trials)) / n;
    let z_squared = WILSON_95_Z_SCORE * WILSON_95_Z_SCORE;
    let denominator = 1.0 + z_squared / n;
    let center = (estimate + z_squared / (2.0 * n)) / denominator;
    let margin = WILSON_95_Z_SCORE
        * (estimate * (1.0 - estimate) / n + z_squared / (4.0 * n * n)).sqrt()
        / denominator;

    (
        (center - margin).max(0.0).min(estimate),
        (center + margin).min(1.0).max(estimate),
    )
}

fn percentile_interpolated(sorted: &[u8], percentile: f64) -> f64 {
    if sorted.is_empty() {
        return 20.0;
    }

    let rank = (sorted.len() as f64 - 1.0) * percentile.clamp(0.0, 1.0);
    let lower_index = rank.floor() as usize;
    let upper_index = rank.ceil() as usize;
    let fraction = rank - lower_index as f64;
    let lower = f64::from(sorted[lower_index]);
    let upper = f64::from(sorted[upper_index]);

    lower + (upper - lower) * fraction
}

fn percentile_position(sorted: &[u8], percentile: f64) -> u8 {
    percentile_interpolated(sorted, percentile).round() as u8
}

fn position_dispersion(sorted: &[u8]) -> (f64, f64) {
    if sorted.is_empty() {
        return (0.0, 0.0);
    }

    let count = sorted.len() as f64;
    let mean = sorted
        .iter()
        .map(|position| f64::from(*position))
        .sum::<f64>()
        / count;
    let variance = sorted
        .iter()
        .map(|position| {
            let difference = f64::from(*position) - mean;
            difference * difference
        })
        .sum::<f64>()
        / count;
    let first_quartile = percentile_interpolated(sorted, 0.25);
    let third_quartile = percentile_interpolated(sorted, 0.75);

    (variance.sqrt(), third_quartile - first_quartile)
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
                Stint {
                    compound: Compound::Medium,
                    laps: 22,
                },
                Stint {
                    compound: Compound::Hard,
                    laps: 26,
                },
                Stint {
                    compound: Compound::Soft,
                    laps: 18,
                },
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
    fn iteration_presets_and_cap_match_ui_precision_levels() {
        assert_eq!(QUICK_ITERATIONS, 500);
        assert_eq!(DEFAULT_ITERATIONS, 2_000);
        assert_eq!(HIGH_CONFIDENCE_ITERATIONS, 5_000);
        assert_eq!(clamp_iterations(5_001), 5_000);
        assert_eq!(clamp_iterations(5_000), 5_000);
        assert_eq!(clamp_iterations(1), 1);
    }

    #[test]
    fn wilson_bounds_contain_point_estimate() {
        for (successes, trials) in [(0, 100), (30, 100), (100, 100)] {
            let estimate = f64::from(successes) / f64::from(trials);
            let (low, high) = wilson_interval(successes, trials);
            assert!(low <= estimate, "{low} should be <= {estimate}");
            assert!(high >= estimate, "{high} should be >= {estimate}");
            assert!((0.0..=1.0).contains(&low));
            assert!((0.0..=1.0).contains(&high));
        }
    }

    #[test]
    fn wilson_interval_narrows_at_larger_equivalent_sample() {
        let (small_low, small_high) = wilson_interval(50, 100);
        let (large_low, large_high) = wilson_interval(500, 1_000);

        assert!(large_high - large_low < small_high - small_low);
    }

    #[test]
    fn percentile_interpolates_between_observations() {
        let positions = [1, 2, 3, 4];

        assert!((percentile_interpolated(&positions, 0.25) - 1.75).abs() < f64::EPSILON);
        assert!((percentile_interpolated(&positions, 0.50) - 2.5).abs() < f64::EPSILON);
        assert!((percentile_interpolated(&positions, 0.75) - 3.25).abs() < f64::EPSILON);
    }

    #[test]
    fn position_dispersion_uses_population_standard_deviation_and_iqr() {
        let positions = [1, 2, 3, 4];
        let (standard_deviation, iqr) = position_dispersion(&positions);

        assert!((standard_deviation - 1.25_f64.sqrt()).abs() < 1e-12);
        assert!((iqr - 1.5).abs() < f64::EPSILON);
    }

    #[test]
    fn report_confidence_intervals_contain_probabilities() {
        let cfg = sample_config(40, 19);
        let report = simulate_many(&cfg).expect("mc").monte_carlo;

        assert!(report.p_win_ci_low <= report.p_win);
        assert!(report.p_win <= report.p_win_ci_high);
        assert!(report.p_podium_ci_low <= report.p_podium);
        assert!(report.p_podium <= report.p_podium_ci_high);
        assert!(report.p_points_ci_low <= report.p_points);
        assert!(report.p_points <= report.p_points_ci_high);
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
        assert_eq!(a.monte_carlo, b.monte_carlo);
        assert_eq!(
            a.playback.stats.final_position,
            b.playback.stats.final_position
        );
    }

    #[test]
    fn generated_seeds_fit_javascript_safe_integer_range() {
        let mut rng = StdRng::seed_from_u64(99);

        for _ in 0..1_000 {
            assert!(generate_seed(&mut rng) <= MAX_SAFE_SEED);
        }
    }
}
