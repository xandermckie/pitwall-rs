import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveLapSnapshot, RaceResult } from "../types/sim";
import { interpolateFrame, raceDuration } from "../utils/interpolate";
import { advanceRaceTime, targetCompletedLap } from "../utils/playback";

export interface PlaybackState {
  raceTime: number;
  duration: number;
  isPaused: boolean;
  isComplete: boolean;
  speed: number;
  snapshot: LiveLapSnapshot | null;
  setSpeed: (speed: number) => void;
  togglePause: () => void;
  scrubToTime: (seconds: number) => void;
  skipLap: (delta: number) => void;
  restart: () => void;
}

export function usePlayback(
  race: RaceResult | null,
  initialSpeed: number,
): PlaybackState {
  const [raceTime, setRaceTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed);
  const raceTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const speedRef = useRef(initialSpeed);
  const duration = useMemo(() => (race ? raceDuration(race) : 0), [race]);

  useEffect(() => {
    raceTimeRef.current = 0;
    pausedRef.current = false;
    speedRef.current = initialSpeed;
    setRaceTime(0);
    setIsPaused(false);
    setIsComplete(false);
    setSpeedState(initialSpeed);
  }, [race, initialSpeed]);

  useEffect(() => {
    if (!race || duration <= 0) {
      return undefined;
    }

    let animationFrame = 0;
    let previousTimestamp: number | null = null;
    const tick = (timestamp: number): void => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }
      const elapsed = timestamp - previousTimestamp;
      previousTimestamp = timestamp;

      if (!pausedRef.current) {
        const next = advanceRaceTime(
          raceTimeRef.current,
          elapsed,
          speedRef.current,
          duration,
        );
        raceTimeRef.current = next;
        setRaceTime(next);
        if (next >= duration) {
          pausedRef.current = true;
          setIsPaused(true);
          setIsComplete(true);
        }
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [duration, race]);

  const togglePause = useCallback((): void => {
    setIsPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const setSpeed = useCallback((nextSpeed: number): void => {
    const safeSpeed = Math.max(nextSpeed, 1);
    speedRef.current = safeSpeed;
    setSpeedState(safeSpeed);
  }, []);

  const scrubToTime = useCallback((seconds: number): void => {
    const next = Math.min(Math.max(seconds, 0), duration);
    raceTimeRef.current = next;
    setRaceTime(next);
    setIsPaused(true);
    pausedRef.current = true;
    setIsComplete(next >= duration);
  }, [duration]);

  const snapshot = useMemo(
    () => (race ? interpolateFrame(race, raceTime) : null),
    [race, raceTime],
  );

  const skipLap = useCallback((delta: number): void => {
    if (!race || !snapshot) {
      return;
    }
    const leaderCompletedLaps =
      snapshot.cars.find((car) => car.position === 1)?.completedLaps ?? 0;
    const targetCompleted = targetCompletedLap(
      leaderCompletedLaps,
      delta,
      race.meta.totalLaps,
    );
    if (targetCompleted === 0) {
      scrubToTime(0);
      return;
    }
    const targetLap = race.laps[targetCompleted - 1];
    const leader = targetLap?.cars.find((car) => car.position === 1);
    scrubToTime(leader?.cumTime ?? duration);
  }, [duration, race, scrubToTime, snapshot]);

  const restart = useCallback((): void => {
    raceTimeRef.current = 0;
    setRaceTime(0);
    setIsPaused(false);
    pausedRef.current = false;
    setIsComplete(false);
  }, []);

  return {
    raceTime,
    duration,
    isPaused,
    isComplete,
    speed,
    snapshot,
    setSpeed,
    togglePause,
    scrubToTime,
    skipLap,
    restart,
  };
}
