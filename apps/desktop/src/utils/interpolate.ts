import type {
  CarSnapshot,
  LiveCarSnapshot,
  LiveLapSnapshot,
  RaceResult,
} from "../types/sim";

interface CarProgress {
  source: CarSnapshot;
  completedLaps: number;
  trackProgress: number;
  lapDuration: number;
  finished: boolean;
}

export function raceDuration(race: RaceResult): number {
  const finalLap = race.laps[race.laps.length - 1];
  if (!finalLap) {
    return 0;
  }
  const winner = finalLap.cars.find((car) => car.position === 1);
  return winner?.cumTime ?? 0;
}

export function interpolateFrame(race: RaceResult, requestedTime: number): LiveLapSnapshot {
  const firstLap = race.laps[0];
  if (!firstLap) {
    throw new Error("Cannot play a race without lap snapshots");
  }

  const duration = raceDuration(race);
  const raceTime = Math.min(Math.max(requestedTime, 0), duration);
  const carIds = firstLap.cars.map((car) => car.id);
  const progressById = carIds
    .map((id) => interpolateCar(race, id, raceTime))
    .filter((progress): progress is CarProgress => progress !== null);

  const ordered = progressById.sort(
    (a, b) =>
      distanceTravelled(b) - distanceTravelled(a) ||
      a.source.gridPos - b.source.gridPos ||
      a.source.id - b.source.id,
  );
  const leader = ordered[0];
  const leaderDistance = leader ? distanceTravelled(leader) : 0;
  const referenceLapTime = Math.max(leader?.lapDuration ?? 90, 1);

  const cars: LiveCarSnapshot[] = ordered.map((progress, index) => {
    const distance = distanceTravelled(progress);
    const ahead = index > 0 ? ordered[index - 1] : null;
    const aheadDistance = ahead ? distanceTravelled(ahead) : distance;
    return {
      ...progress.source,
      position: index + 1,
      gap: round3((leaderDistance - distance) * referenceLapTime),
      interval: round3((aheadDistance - distance) * referenceLapTime),
      trackProgress: progress.trackProgress,
      completedLaps: progress.completedLaps,
      finished: progress.finished,
    };
  });

  const leaderProgress = leader ?? progressById[0];
  const displayLap = leaderProgress
    ? Math.min(leaderProgress.completedLaps + 1, race.meta.totalLaps)
    : 1;
  const sourceLap = race.laps[Math.max(0, displayLap - 1)] ?? firstLap;
  const completedLap =
    leaderProgress && leaderProgress.completedLaps > 0
      ? race.laps[leaderProgress.completedLaps - 1]
      : null;

  return {
    lap: displayLap,
    inSc: sourceLap.inSc,
    isRaining: sourceLap.isRaining,
    scLap: sourceLap.scLap,
    fastestLap: completedLap?.fastestLap ?? {
      time: 999.9,
      driver: "",
      lap: 0,
    },
    raceTime,
    cars,
  };
}

function interpolateCar(race: RaceResult, carId: number, raceTime: number): CarProgress | null {
  let previousEnd = 0;
  let previousSource: CarSnapshot | null = null;

  for (let lapIndex = 0; lapIndex < race.laps.length; lapIndex += 1) {
    const source = race.laps[lapIndex].cars.find((car) => car.id === carId);
    if (!source) {
      continue;
    }
    const lapStart = previousEnd;
    const driveStart = Math.max(lapStart, source.cumTime - source.lapTime);
    const lapDuration = Math.max(source.cumTime - driveStart, 0.001);

    if (raceTime < driveStart) {
      return {
        source: inProgressSource(source, previousSource, previousEnd),
        completedLaps: lapIndex,
        trackProgress: 0,
        lapDuration,
        finished: false,
      };
    }
    if (raceTime < source.cumTime) {
      return {
        source: inProgressSource(source, previousSource, previousEnd),
        completedLaps: lapIndex,
        trackProgress: clamp01((raceTime - driveStart) / lapDuration),
        lapDuration,
        finished: false,
      };
    }

    previousEnd = source.cumTime;
    previousSource = source;
  }

  if (!previousSource) {
    return null;
  }
  return {
    source: previousSource,
    completedLaps: race.laps.length,
    trackProgress: 0,
    lapDuration: Math.max(previousSource.lapTime, 0.001),
    finished: true,
  };
}

function inProgressSource(
  source: CarSnapshot,
  previousSource: CarSnapshot | null,
  previousEnd: number,
): CarSnapshot {
  const tyreAge = source.pitting
    ? source.tyreAge
    : previousSource?.tyreAge ?? Math.max(source.tyreAge - 1, 0);

  return {
    ...source,
    cumTime: previousEnd,
    lapTime: 0,
    tyreAge,
    tyreDelta: 0,
    rainPen: 0,
    error: 0,
    drs: previousSource?.drs ?? false,
  };
}

function distanceTravelled(progress: CarProgress): number {
  return progress.completedLaps + progress.trackProgress;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
