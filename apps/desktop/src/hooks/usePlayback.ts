import { useCallback, useEffect, useRef, useState } from "react";
import type { LapSnapshot, RaceResult } from "../types/sim";

export interface PlaybackState {
  index: number;
  isPaused: boolean;
  isComplete: boolean;
  speedMs: number;
  snapshot: LapSnapshot | null;
  setSpeedMs: (ms: number) => void;
  togglePause: () => void;
  scrubTo: (lapIndex: number) => void;
  restart: () => void;
}

export function usePlayback(
  race: RaceResult | null,
  initialSpeedMs: number,
): PlaybackState {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    indexRef.current = 0;
    pausedRef.current = false;
    setIndex(0);
    setIsPaused(false);
    setIsComplete(false);
    setSpeedMs(initialSpeedMs);
  }, [race, initialSpeedMs]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!race || race.laps.length === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (pausedRef.current) {
        return;
      }
      const next = indexRef.current + 1;
      if (next >= race.laps.length) {
        setIsComplete(true);
        setIsPaused(true);
        pausedRef.current = true;
        return;
      }
      indexRef.current = next;
      setIndex(next);
    }, speedMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [race, speedMs]);

  const togglePause = useCallback((): void => {
    setIsPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const scrubTo = useCallback((lapIndex: number): void => {
    indexRef.current = lapIndex;
    setIndex(lapIndex);
    setIsPaused(true);
    pausedRef.current = true;
    setIsComplete(false);
  }, []);

  const restart = useCallback((): void => {
    indexRef.current = 0;
    setIndex(0);
    setIsPaused(false);
    pausedRef.current = false;
    setIsComplete(false);
  }, []);

  const snapshot = race?.laps[index] ?? null;

  return {
    index,
    isPaused,
    isComplete,
    speedMs,
    snapshot,
    setSpeedMs,
    togglePause,
    scrubTo,
    restart,
  };
}
