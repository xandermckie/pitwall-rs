import type { CarSnapshot, LapSnapshot } from "../types/sim";
import { driverCode } from "./format";

export const BATTLE_INTERVAL_S = 1.0;

export interface Overtake {
  passerId: number;
  passedId: number;
  passer: string;
  passed: string;
  newPosition: number;
  places: number;
  isLeadChange: boolean;
  isUser: boolean;
}

export interface Battle {
  hunterId: number;
  preyId: number;
  hunter: string;
  prey: string;
  interval: number;
}

export type CalloutKind =
  | "chequered"
  | "sc"
  | "lead"
  | "overtake"
  | "last-lap"
  | "fl"
  | "rain"
  | "pit"
  | "sc-end"
  | "battle";

export interface BroadcastCallout {
  kind: CalloutKind;
  title: string;
  detail: string;
}

export interface LapDrama {
  deltas: Map<number, number>;
  overtakes: Overtake[];
  battles: Battle[];
  battleIds: Set<number>;
  overtakeIds: Set<number>;
  closestBattle: Battle | null;
  callout: BroadcastCallout | null;
}

interface DramaOptions {
  totalLaps: number;
  isFinish: boolean;
}

export function positionDeltas(
  previous: LapSnapshot | null,
  current: LapSnapshot,
): Map<number, number> {
  const deltas = new Map<number, number>();
  if (!previous) {
    return deltas;
  }
  const prevById = new Map(previous.cars.map((car) => [car.id, car]));
  for (const car of current.cars) {
    const prior = prevById.get(car.id);
    if (!prior) {
      continue;
    }
    deltas.set(car.id, prior.position - car.position);
  }
  return deltas;
}

export function detectOvertakes(
  previous: LapSnapshot | null,
  current: LapSnapshot,
): Overtake[] {
  if (!previous) {
    return [];
  }
  const prevById = new Map(previous.cars.map((car) => [car.id, car]));
  const overtakes: Overtake[] = [];
  for (const car of current.cars) {
    const prior = prevById.get(car.id);
    if (!prior || car.position >= prior.position) {
      continue;
    }
    const victim = previous.cars.find((item) => item.position === car.position);
    if (!victim || victim.id === car.id) {
      continue;
    }
    const places = prior.position - car.position;
    overtakes.push({
      passerId: car.id,
      passedId: victim.id,
      passer: car.driver,
      passed: victim.driver,
      newPosition: car.position,
      places,
      isLeadChange: car.position === 1,
      isUser: car.isUser || victim.isUser,
    });
  }
  overtakes.sort((a, b) => {
    if (a.isLeadChange !== b.isLeadChange) {
      return a.isLeadChange ? -1 : 1;
    }
    if (a.isUser !== b.isUser) {
      return a.isUser ? -1 : 1;
    }
    return b.places - a.places;
  });
  return overtakes;
}

export function detectBattles(current: LapSnapshot, threshold = BATTLE_INTERVAL_S): Battle[] {
  const order = [...current.cars].sort((a, b) => a.position - b.position);
  const battles: Battle[] = [];
  for (let i = 1; i < order.length; i += 1) {
    const hunter = order[i];
    const prey = order[i - 1];
    if (hunter.pitting || prey.pitting) {
      continue;
    }
    if (hunter.interval > threshold) {
      continue;
    }
    battles.push({
      hunterId: hunter.id,
      preyId: prey.id,
      hunter: hunter.driver,
      prey: prey.driver,
      interval: hunter.interval,
    });
  }
  battles.sort((a, b) => a.interval - b.interval);
  return battles;
}

export function pickCallout(
  previous: LapSnapshot | null,
  current: LapSnapshot,
  overtakes: Overtake[],
  battles: Battle[],
  options: DramaOptions,
): BroadcastCallout | null {
  if (options.isFinish) {
    const winner = current.cars.find((car) => car.position === 1);
    return {
      kind: "chequered",
      title: "Chequered flag",
      detail: winner ? `${winner.driver} takes the win` : "Race complete",
    };
  }
  if (current.inSc && current.lap === current.scLap) {
    return {
      kind: "sc",
      title: "Safety car",
      detail: "Field bunched · cheap pit window",
    };
  }
  const leadChange = overtakes.find((item) => item.isLeadChange);
  if (leadChange) {
    return {
      kind: "lead",
      title: "Lead change",
      detail: `${driverCode(leadChange.passer)} takes P1 from ${driverCode(leadChange.passed)}`,
    };
  }
  const headline = overtakes[0];
  if (headline) {
    return {
      kind: "overtake",
      title: headline.isUser ? "Your move" : "Overtake",
      detail: `${driverCode(headline.passer)} passes ${driverCode(headline.passed)} for P${headline.newPosition}`,
    };
  }
  if (current.lap === options.totalLaps && options.totalLaps > 0) {
    return {
      kind: "last-lap",
      title: "Last lap",
      detail: "Everything still to play for",
    };
  }
  if (current.fastestLap.lap === current.lap && current.fastestLap.driver) {
    return {
      kind: "fl",
      title: "Fastest lap",
      detail: current.fastestLap.driver,
    };
  }
  if (current.isRaining && !previous?.isRaining) {
    return {
      kind: "rain",
      title: "Rain",
      detail: "Inter window is open",
    };
  }
  const userPit = current.cars.find((car) => car.pitting && car.isUser);
  if (userPit) {
    return {
      kind: "pit",
      title: "Pit stop",
      detail: `${userPit.driver} boxes for ${userPit.compound}`,
    };
  }
  const closest = battles[0];
  if (closest && closest.interval <= 0.35) {
    return {
      kind: "battle",
      title: "Battle",
      detail: `${driverCode(closest.hunter)} hunts ${driverCode(closest.prey)} · ${closest.interval.toFixed(2)}s`,
    };
  }
  return null;
}

export function buildLapDrama(
  previous: LapSnapshot | null,
  current: LapSnapshot,
  options: DramaOptions,
): LapDrama {
  const deltas = positionDeltas(previous, current);
  const overtakes = detectOvertakes(previous, current);
  const battles = detectBattles(current);
  const battleIds = new Set<number>();
  for (const battle of battles) {
    battleIds.add(battle.hunterId);
    battleIds.add(battle.preyId);
  }
  const overtakeIds = new Set(overtakes.map((item) => item.passerId));
  return {
    deltas,
    overtakes,
    battles,
    battleIds,
    overtakeIds,
    closestBattle: battles[0] ?? null,
    callout: pickCallout(previous, current, overtakes, battles, options),
  };
}

export function carPressureLine(car: CarSnapshot, battles: Battle[]): string | null {
  const hunting = battles.find((item) => item.hunterId === car.id);
  if (hunting) {
    return `Hunting ${driverCode(hunting.prey)} · +${hunting.interval.toFixed(2)}s`;
  }
  const defending = battles.find((item) => item.preyId === car.id);
  if (defending) {
    return `Under pressure from ${driverCode(defending.hunter)}`;
  }
  return null;
}
