export function formatLapTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--.---";
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${remainder}`;
}

export function formatGap(gap: number): string {
  if (!Number.isFinite(gap) || gap <= 0) {
    return "LEADER";
  }
  return `+${gap.toFixed(2)}`;
}

export function formatInterval(interval: number, position: number): string {
  if (position === 1) {
    return "LEADER";
  }
  return `+${interval.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPosition(position: number): string {
  return `P${position}`;
}

export function formatSeed(seed: number): string {
  return seed.toString();
}
