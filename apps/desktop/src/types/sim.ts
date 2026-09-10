export type Compound = "SOFT" | "MEDIUM" | "HARD" | "INTER" | "WET";
export type Weather = "DRY" | "MIXED" | "WET";
export type AppMode = "briefing" | "race" | "analysis";

export interface Race {
  id: number;
  name: string;
  circuit: string;
  laps: number;
  scProb: number;
  deg: number;
  overtake: number;
}

export interface Team {
  name: string;
  color: string;
  drivers: [string, string];
  pace: number;
  degResistance: number;
}

export interface Standing {
  pos: number;
  driver: string;
  team: string;
  points: number;
}

export interface Stint {
  compound: Compound;
  laps: number;
}

export interface TyreCompoundMeta {
  peak: number;
  cliff: number;
  degRate: number;
  baseDelta: number;
  color: string;
  label: string;
}

export type TyreModel = Record<string, TyreCompoundMeta>;

export interface SimConfig {
  raceId: number;
  team: string;
  gridPosition: number;
  stints: Stint[];
  weather: Weather;
  safetyCarExpected: boolean;
  iterations: number;
  seed: number | null;
}

export interface FastestLap {
  time: number;
  driver: string;
  lap: number;
}

export interface CarSnapshot {
  id: number;
  driver: string;
  team: string;
  color: string;
  isUser: boolean;
  isLead: boolean;
  isTeammate: boolean;
  gridPos: number;
  cumTime: number;
  lapTime: number;
  compound: Compound;
  tyreAge: number;
  tyreDelta: number;
  pitting: boolean;
  rainPen: number;
  error: number;
  position: number;
  gap: number;
  interval: number;
  drs: boolean;
}

export interface LapSnapshot {
  lap: number;
  inSc: boolean;
  isRaining: boolean;
  scLap: number | null;
  fastestLap: FastestLap;
  cars: CarSnapshot[];
}

export interface RaceMeta {
  race: Race;
  team: string;
  teamColor: string;
  stints: Stint[];
  grid: number;
  weather: Weather;
  hasSc: boolean;
  scLap: number | null;
  scDur: number;
  rainLap: number | null;
  totalLaps: number;
}

export interface RaceStats {
  finalPosition: number;
  pointsScored: number;
  teamPoints: number;
  avgPosition: number;
  gapToWinner: number;
  fastestLap: FastestLap;
  practicality: number;
}

export interface RaceResult {
  meta: RaceMeta;
  stats: RaceStats;
  laps: LapSnapshot[];
}

export interface MonteCarloReport {
  iterations: number;
  seed: number;
  positionHistogram: number[];
  expectedPoints: number;
  pWin: number;
  pPodium: number;
  pPoints: number;
  scRate: number;
  rainRate: number;
  medianPosition: number;
  p05Position: number;
  p95Position: number;
}

export interface SimResponse {
  playback: RaceResult;
  monteCarlo: MonteCarloReport;
  seed: number;
}

export interface BriefingForm {
  raceId: number;
  team: string;
  gridPosition: number;
  weather: Weather;
  safetyCarExpected: boolean;
  iterations: number;
  seed: string;
  stops: number;
  stints: Stint[];
  playbackMs: number;
}
