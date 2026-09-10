use std::collections::HashMap;

use crate::types::{Compound, Race, Standing, Team, TyreCompoundMeta};

pub const POINTS_TABLE: [u16; 11] = [0, 25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

pub fn points_for(position: u8) -> u16 {
    POINTS_TABLE
        .get(position as usize)
        .copied()
        .unwrap_or(0)
}

pub fn races() -> Vec<Race> {
    RACES.iter().map(RaceDef::to_race).collect()
}

pub fn race_by_id(id: u8) -> Option<Race> {
    RACES.iter().find(|r| r.id == id).map(RaceDef::to_race)
}

pub fn team_by_name(name: &str) -> Option<&'static TeamRecord> {
    TEAMS.iter().find(|t| t.name.eq_ignore_ascii_case(name))
}

pub fn public_teams() -> Vec<Team> {
    TEAMS
        .iter()
        .map(|t| Team {
            name: t.name.to_string(),
            color: t.color.to_string(),
            drivers: [t.drivers[0].to_string(), t.drivers[1].to_string()],
            pace: t.race_pace,
            deg_resistance: t.deg_resistance,
        })
        .collect()
}

pub fn standings() -> Vec<Standing> {
    STANDINGS
        .iter()
        .map(|row| Standing {
            pos: row.pos,
            driver: row.driver.to_string(),
            team: row.team.to_string(),
            points: row.points,
        })
        .collect()
}

struct StandingDef {
    pos: u8,
    driver: &'static str,
    team: &'static str,
    points: u16,
}

pub fn tyre_model_public() -> HashMap<String, TyreCompoundMeta> {
    [
        Compound::Soft,
        Compound::Medium,
        Compound::Hard,
        Compound::Inter,
        Compound::Wet,
    ]
    .into_iter()
    .map(|compound| {
        let params = crate::tyre::params(compound);
        let key = match compound {
            Compound::Soft => "SOFT",
            Compound::Medium => "MEDIUM",
            Compound::Hard => "HARD",
            Compound::Inter => "INTER",
            Compound::Wet => "WET",
        };
        (
            key.to_string(),
            TyreCompoundMeta {
                peak: params.peak,
                cliff: params.cliff,
                deg_rate: params.deg_rate,
                base_delta: params.base_delta,
                color: compound.color().to_string(),
                label: compound.label().to_string(),
            },
        )
    })
    .collect()
}

#[derive(Debug, Clone, Copy)]
pub struct TeamRecord {
    pub name: &'static str,
    pub race_pace: f64,
    pub qual_gap: f64,
    pub deg_resistance: f64,
    pub color: &'static str,
    pub drivers: [&'static str; 2],
}

struct RaceDef {
    id: u8,
    name: &'static str,
    circuit: &'static str,
    laps: u16,
    sc_prob: f64,
    deg: f64,
    overtake: f64,
}

impl RaceDef {
    fn to_race(&self) -> Race {
        Race {
            id: self.id,
            name: self.name.to_string(),
            circuit: self.circuit.to_string(),
            laps: self.laps,
            sc_prob: self.sc_prob,
            deg: self.deg,
            overtake: self.overtake,
        }
    }
}

const RACES: [RaceDef; 12] = [
    RaceDef { id: 0,  name: "Australian GP",    circuit: "Albert Park",       laps: 58, sc_prob: 0.45, deg: 0.65, overtake: 0.35 },
    RaceDef { id: 1,  name: "Chinese GP",       circuit: "Shanghai",          laps: 56, sc_prob: 0.35, deg: 0.70, overtake: 0.50 },
    RaceDef { id: 2,  name: "Japanese GP",      circuit: "Suzuka",            laps: 53, sc_prob: 0.30, deg: 0.55, overtake: 0.30 },
    RaceDef { id: 3,  name: "Bahrain GP",       circuit: "Bahrain Int'l",     laps: 57, sc_prob: 0.30, deg: 0.85, overtake: 0.65 },
    RaceDef { id: 4,  name: "Saudi Arabian GP", circuit: "Jeddah Corniche",   laps: 50, sc_prob: 0.55, deg: 0.60, overtake: 0.40 },
    RaceDef { id: 5,  name: "Spanish GP",       circuit: "Barcelona",         laps: 66, sc_prob: 0.25, deg: 0.80, overtake: 0.45 },
    RaceDef { id: 6,  name: "Monaco GP",        circuit: "Monte Carlo",       laps: 78, sc_prob: 0.45, deg: 0.30, overtake: 0.10 },
    RaceDef { id: 7,  name: "Canadian GP",      circuit: "Gilles Villeneuve", laps: 70, sc_prob: 0.55, deg: 0.65, overtake: 0.60 },
    RaceDef { id: 8,  name: "British GP",       circuit: "Silverstone",       laps: 52, sc_prob: 0.40, deg: 0.75, overtake: 0.55 },
    RaceDef { id: 9,  name: "Italian GP",       circuit: "Monza",             laps: 53, sc_prob: 0.35, deg: 0.50, overtake: 0.65 },
    RaceDef { id: 10, name: "Singapore GP",     circuit: "Marina Bay",        laps: 62, sc_prob: 0.55, deg: 0.60, overtake: 0.20 },
    RaceDef { id: 11, name: "Abu Dhabi GP",     circuit: "Yas Marina",        laps: 58, sc_prob: 0.30, deg: 0.65, overtake: 0.45 },
];

pub const TEAMS: [TeamRecord; 10] = [
    TeamRecord { name: "McLaren",      race_pace: 0.996, qual_gap: 0.000, deg_resistance: 0.88, color: "#FF8000", drivers: ["PIASTRI", "NORRIS"] },
    TeamRecord { name: "Ferrari",      race_pace: 0.994, qual_gap: 0.001, deg_resistance: 0.82, color: "#E8002D", drivers: ["LECLERC", "HAMILTON"] },
    TeamRecord { name: "Mercedes",     race_pace: 0.998, qual_gap: 0.003, deg_resistance: 0.85, color: "#27F4D2", drivers: ["RUSSELL", "ANTONELLI"] },
    TeamRecord { name: "Red Bull",     race_pace: 1.003, qual_gap: 0.005, deg_resistance: 0.80, color: "#3671C6", drivers: ["VERSTAPPEN", "TSUNODA"] },
    TeamRecord { name: "Aston Martin", race_pace: 1.008, qual_gap: 0.010, deg_resistance: 0.78, color: "#229971", drivers: ["ALONSO", "STROLL"] },
    TeamRecord { name: "Williams",     race_pace: 1.010, qual_gap: 0.012, deg_resistance: 0.76, color: "#64C4FF", drivers: ["SAINZ", "ALBON"] },
    TeamRecord { name: "Alpine",       race_pace: 1.015, qual_gap: 0.015, deg_resistance: 0.74, color: "#FF87BC", drivers: ["GASLY", "DOOHAN"] },
    TeamRecord { name: "Racing Bulls", race_pace: 1.018, qual_gap: 0.017, deg_resistance: 0.75, color: "#6692FF", drivers: ["HADJAR", "LAWSON"] },
    TeamRecord { name: "Haas",         race_pace: 1.020, qual_gap: 0.018, deg_resistance: 0.72, color: "#B6BABD", drivers: ["BEARMAN", "OCON"] },
    TeamRecord { name: "Kick Sauber",  race_pace: 1.022, qual_gap: 0.022, deg_resistance: 0.70, color: "#52E252", drivers: ["HULKENBERG", "BORTOLETO"] },
];

const STANDINGS: [StandingDef; 20] = [
    StandingDef { pos: 1,  driver: "Oscar Piastri",    team: "McLaren",      points: 161 },
    StandingDef { pos: 2,  driver: "Lando Norris",     team: "McLaren",      points: 148 },
    StandingDef { pos: 3,  driver: "Charles Leclerc",  team: "Ferrari",      points: 112 },
    StandingDef { pos: 4,  driver: "Lewis Hamilton",   team: "Ferrari",      points: 108 },
    StandingDef { pos: 5,  driver: "George Russell",   team: "Mercedes",     points: 93 },
    StandingDef { pos: 6,  driver: "Max Verstappen",   team: "Red Bull",      points: 89 },
    StandingDef { pos: 7,  driver: "Kimi Antonelli",   team: "Mercedes",     points: 72 },
    StandingDef { pos: 8,  driver: "Carlos Sainz",     team: "Williams",     points: 61 },
    StandingDef { pos: 9,  driver: "Fernando Alonso",  team: "Aston Martin", points: 44 },
    StandingDef { pos: 10, driver: "Lance Stroll",     team: "Aston Martin", points: 28 },
    StandingDef { pos: 11, driver: "Nico Hulkenberg",  team: "Kick Sauber",  points: 26 },
    StandingDef { pos: 12, driver: "Isack Hadjar",     team: "Racing Bulls", points: 20 },
    StandingDef { pos: 13, driver: "Alex Albon",       team: "Williams",     points: 18 },
    StandingDef { pos: 14, driver: "Pierre Gasly",     team: "Alpine",       points: 12 },
    StandingDef { pos: 15, driver: "Yuki Tsunoda",     team: "Red Bull",      points: 11 },
    StandingDef { pos: 16, driver: "Jack Doohan",      team: "Alpine",       points: 8 },
    StandingDef { pos: 17, driver: "Oliver Bearman",   team: "Haas",         points: 6 },
    StandingDef { pos: 18, driver: "Esteban Ocon",     team: "Haas",         points: 5 },
    StandingDef { pos: 19, driver: "Liam Lawson",      team: "Racing Bulls", points: 3 },
    StandingDef { pos: 20, driver: "Gabriel Bortoleto",team: "Kick Sauber",  points: 1 },
];
