use std::collections::HashMap;

use pitwall_sim::{
    public_teams, races, standings, tyre_model_public, SimConfig, SimResponse, Standing, Team,
    TyreCompoundMeta,
};

#[tauri::command]
fn get_calendar() -> Vec<pitwall_sim::Race> {
    races()
}

#[tauri::command]
fn get_teams() -> Vec<Team> {
    public_teams()
}

#[tauri::command]
fn get_standings() -> Vec<Standing> {
    standings()
}

#[tauri::command]
fn get_tyre_model() -> HashMap<String, TyreCompoundMeta> {
    tyre_model_public()
}

#[tauri::command]
fn simulate(config: SimConfig) -> Result<SimResponse, String> {
    pitwall_sim::simulate_many(&config).map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_calendar,
            get_teams,
            get_standings,
            get_tyre_model,
            simulate
        ])
        .run(tauri::generate_context!())
        .expect("error while running PITWALL");
}
