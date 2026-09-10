use serde::{Deserialize, Serialize};

use crate::error::SimError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Race {
    pub id: u8,
    pub name: String,
    pub circuit: String,
    pub laps: u16,
    pub sc_prob: f64,
    pub deg: f64,
    pub overtake: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Team {
    pub name: String,
    pub color: String,
    pub drivers: [String; 2],
    pub pace: f64,
    pub deg_resistance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Standing {
    pub pos: u8,
    pub driver: String,
    pub team: String,
    pub points: u16,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "UPPERCASE")]
pub enum Compound {
    Soft,
    Medium,
    Hard,
    Inter,
    Wet,
}

impl Compound {
    pub fn label(self) -> &'static str {
        match self {
            Self::Soft => "S",
            Self::Medium => "M",
            Self::Hard => "H",
            Self::Inter => "I",
            Self::Wet => "W",
        }
    }

    pub fn color(self) -> &'static str {
        match self {
            Self::Soft => "#E8002D",
            Self::Medium => "#FFD700",
            Self::Hard => "#E0E0E0",
            Self::Inter => "#39B54A",
            Self::Wet => "#0067FF",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Weather {
    Dry,
    Mixed,
    Wet,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Stint {
    pub compound: Compound,
    pub laps: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TyreCompoundMeta {
    pub peak: u16,
    pub cliff: u16,
    pub deg_rate: f64,
    pub base_delta: f64,
    pub color: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SimConfig {
    pub race_id: u8,
    pub team: String,
    pub grid_position: u8,
    pub stints: Vec<Stint>,
    pub weather: Weather,
    pub safety_car_expected: bool,
    #[serde(default = "default_iterations")]
    pub iterations: u32,
    pub seed: Option<u64>,
}

fn default_iterations() -> u32 {
    500
}

impl SimConfig {
    pub fn validate(&self) -> Result<(), SimError> {
        if !(1..=20).contains(&self.grid_position) {
            return Err(SimError::InvalidConfig("grid_position must be 1-20".into()));
        }
        if self.stints.is_empty() {
            return Err(SimError::InvalidConfig("No stints provided".into()));
        }
        if self.iterations == 0 {
            return Err(SimError::InvalidConfig("iterations must be at least 1".into()));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FastestLap {
    pub time: f64,
    pub driver: String,
    pub lap: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CarSnapshot {
    pub id: u8,
    pub driver: String,
    pub team: String,
    pub color: String,
    pub is_user: bool,
    pub is_lead: bool,
    pub is_teammate: bool,
    pub grid_pos: u8,
    pub cum_time: f64,
    pub lap_time: f64,
    pub compound: Compound,
    pub tyre_age: u16,
    pub tyre_delta: f64,
    pub pitting: bool,
    pub rain_pen: f64,
    pub error: f64,
    pub position: u8,
    pub gap: f64,
    pub interval: f64,
    pub drs: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LapSnapshot {
    pub lap: u16,
    pub in_sc: bool,
    pub is_raining: bool,
    pub sc_lap: Option<u16>,
    pub fastest_lap: FastestLap,
    pub cars: Vec<CarSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RaceMeta {
    pub race: Race,
    pub team: String,
    pub team_color: String,
    pub stints: Vec<Stint>,
    pub grid: u8,
    pub weather: Weather,
    pub has_sc: bool,
    pub sc_lap: Option<u16>,
    pub sc_dur: u16,
    pub rain_lap: Option<u16>,
    pub total_laps: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RaceStats {
    pub final_position: u8,
    pub points_scored: u16,
    pub team_points: u16,
    pub avg_position: f64,
    pub gap_to_winner: f64,
    pub fastest_lap: FastestLap,
    pub practicality: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RaceResult {
    pub meta: RaceMeta,
    pub stats: RaceStats,
    pub laps: Vec<LapSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloReport {
    pub iterations: u32,
    pub seed: u64,
    pub position_histogram: Vec<u32>,
    pub expected_points: f64,
    pub p_win: f64,
    pub p_podium: f64,
    pub p_points: f64,
    pub sc_rate: f64,
    pub rain_rate: f64,
    pub median_position: u8,
    pub p05_position: u8,
    pub p95_position: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SimResponse {
    pub playback: RaceResult,
    pub monte_carlo: MonteCarloReport,
    pub seed: u64,
}
