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

export function formatPercentRange(low: number, high: number): string {
  return `${(low * 100).toFixed(1)}–${(high * 100).toFixed(1)}%`;
}

export function formatPosition(position: number): string {
  return `P${position}`;
}

export function formatSeed(seed: number): string {
  return seed.toString();
}

export function driverCode(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? name;
  return last.slice(0, 3).toUpperCase();
}

export function formatDelta(delta: number | undefined): string {
  if (delta === undefined || delta === 0) {
    return "";
  }
  return delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`;
}
