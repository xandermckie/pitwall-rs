use crate::types::Compound;

#[derive(Debug, Clone, Copy)]
pub struct TyreParams {
    pub peak: u16,
    pub cliff: u16,
    pub deg_rate: f64,
    pub base_delta: f64,
}

pub fn params(compound: Compound) -> TyreParams {
    match compound {
        Compound::Soft => TyreParams {
            peak: 8,
            cliff: 18,
            deg_rate: 0.045,
            base_delta: -0.40,
        },
        Compound::Medium => TyreParams {
            peak: 15,
            cliff: 32,
            deg_rate: 0.028,
            base_delta: 0.00,
        },
        Compound::Hard => TyreParams {
            peak: 25,
            cliff: 50,
            deg_rate: 0.018,
            base_delta: 0.25,
        },
        Compound::Inter => TyreParams {
            peak: 15,
            cliff: 30,
            deg_rate: 0.035,
            base_delta: 0.00,
        },
        Compound::Wet => TyreParams {
            peak: 20,
            cliff: 40,
            deg_rate: 0.025,
            base_delta: 0.30,
        },
    }
}

pub fn fresh_tyre_out_lap_penalty(compound: Compound) -> f64 {
    match compound {
        Compound::Soft => 0.45,
        Compound::Medium => 0.65,
        Compound::Hard => 0.90,
        Compound::Inter => 0.75,
        Compound::Wet => 1.00,
    }
}

/// Lap-time delta in seconds versus a reference fresh medium.
///
/// `deg_resistance` (0-1) reduces degradation after the peak window.
/// Warm-up and the compound's base offset are unchanged.
pub fn calculate_tyre_delta(
    compound: Compound,
    lap_on_tyre: u16,
    track_deg: f64,
    deg_resistance: f64,
) -> f64 {
    let model = params(compound);
    let resistance = deg_resistance.clamp(0.0, 1.0);
    let effective_deg = track_deg * (1.0 - resistance * 0.4);

    let delta = if lap_on_tyre <= model.peak {
        let warmup_span = f64::from(model.peak) * 0.4;
        let warmup = (f64::from(lap_on_tyre) / warmup_span.max(1.0)).min(1.0);
        model.base_delta * warmup
    } else if lap_on_tyre <= model.cliff {
        let past_peak = f64::from(lap_on_tyre - model.peak);
        model.base_delta + past_peak * model.deg_rate * effective_deg
    } else {
        let linear_deg = f64::from(model.cliff - model.peak) * model.deg_rate * effective_deg;
        let cliff_deg =
            f64::from(lap_on_tyre - model.cliff) * model.deg_rate * effective_deg * 2.5;
        model.base_delta + linear_deg + cliff_deg
    };

    (delta * 10_000.0).round() / 10_000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn warmup_scales_soft_base_delta() {
        let delta = calculate_tyre_delta(Compound::Soft, 1, 0.8, 0.0);
        let warmup = (1.0_f64 / (8.0 * 0.4)).min(1.0);
        let expected = (-0.40 * warmup * 10_000.0).round() / 10_000.0;
        assert!((delta - expected).abs() < 1e-9);
    }

    #[test]
    fn peak_lap_uses_full_base_delta() {
        let delta = calculate_tyre_delta(Compound::Soft, 8, 0.8, 0.0);
        assert!((delta - (-0.40)).abs() < 1e-9);
    }

    #[test]
    fn linear_phase_adds_track_deg() {
        let delta = calculate_tyre_delta(Compound::Soft, 12, 1.0, 0.0);
        let expected = -0.40_f64 + 4.0 * 0.045;
        assert!((delta - expected).abs() < 1e-9);
    }

    #[test]
    fn cliff_accelerates_degradation() {
        let at_cliff = calculate_tyre_delta(Compound::Soft, 18, 1.0, 0.0);
        let past_cliff = calculate_tyre_delta(Compound::Soft, 19, 1.0, 0.0);
        let step = past_cliff - at_cliff;
        assert!((step - 0.045 * 2.5).abs() < 1e-6);
    }

    #[test]
    fn deg_resistance_reduces_post_peak_delta() {
        let open = calculate_tyre_delta(Compound::Soft, 16, 1.0, 0.0);
        let resistant = calculate_tyre_delta(Compound::Soft, 16, 1.0, 0.88);
        assert!(resistant < open);
    }

    #[test]
    fn fresh_tyre_out_lap_penalty_depends_on_compound() {
        let soft = fresh_tyre_out_lap_penalty(Compound::Soft);
        let medium = fresh_tyre_out_lap_penalty(Compound::Medium);
        let hard = fresh_tyre_out_lap_penalty(Compound::Hard);

        assert!(soft > 0.0);
        assert!(soft < medium);
        assert!(medium < hard);
    }
}
