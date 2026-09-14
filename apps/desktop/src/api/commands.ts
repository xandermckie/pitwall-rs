import { invoke } from "@tauri-apps/api/core";
import type {
  Race,
  SimConfig,
  SimResponse,
  Standing,
  Team,
  TyreModel,
} from "../types/sim";
import {
  SimulationInputError,
  validateSimConfig,
} from "../utils/simulationValidation";

export async function fetchCalendar(): Promise<Race[]> {
  return invoke<Race[]>("get_calendar");
}

export async function fetchTeams(): Promise<Team[]> {
  return invoke<Team[]>("get_teams");
}

export async function fetchStandings(): Promise<Standing[]> {
  return invoke<Standing[]>("get_standings");
}

export async function fetchTyreModel(): Promise<TyreModel> {
  return invoke<TyreModel>("get_tyre_model");
}

export async function runSimulation(config: SimConfig): Promise<SimResponse> {
  const validationError = validateSimConfig(config);
  if (validationError) {
    throw new SimulationInputError(validationError);
  }
  return invoke<SimResponse>("simulate", { config });
}
