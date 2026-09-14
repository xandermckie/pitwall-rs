export const PLAYBACK_SPEEDS = [1, 2, 4, 8, 16, 32, 64] as const;

export function advanceRaceTime(
  currentSeconds: number,
  elapsedMilliseconds: number,
  speed: number,
  durationSeconds: number,
): number {
  const elapsedSeconds = Math.max(elapsedMilliseconds, 0) / 1000;
  return Math.min(currentSeconds + elapsedSeconds * Math.max(speed, 0), durationSeconds);
}

export function formatRaceClock(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds - minutes * 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
}

export function targetCompletedLap(
  leaderCompletedLaps: number,
  delta: number,
  totalLaps: number,
): number {
  const total = Math.max(Math.trunc(totalLaps), 0);
  const target = Math.trunc(leaderCompletedLaps) + Math.trunc(delta);
  return Math.min(Math.max(target, 0), total);
}
