import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { AnalysisView } from "./components/AnalysisView";
import { AppHeader } from "./components/AppHeader";
import { BriefingView } from "./components/BriefingView";
import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { RaceView } from "./components/RaceView";
import { useCatalog } from "./hooks/useCatalog";
import { useFullscreen } from "./hooks/useFullscreen";
import { useKeyboardPlayback } from "./hooks/useKeyboardPlayback";
import { usePlayback } from "./hooks/usePlayback";
import { useSimulation } from "./hooks/useSimulation";
import type { AppMode, BriefingForm, SimConfig } from "./types/sim";
import { parseSeed } from "./utils/seed";
import { defaultStints, stintTotal } from "./utils/stints";
import "./styles/app.css";

const INITIAL: BriefingForm = {
  raceId: 5,
  team: "McLaren",
  gridPosition: 2,
  weather: "DRY",
  safetyCarExpected: false,
  iterations: 2_000,
  seed: "",
  stops: 2,
  stints: defaultStints(2, 66),
  playbackSpeed: 16,
};

export default function App(): JSX.Element {
  const catalog = useCatalog();
  const fullscreen = useFullscreen();
  const simulation = useSimulation();
  const [form, setForm] = useState<BriefingForm>(INITIAL);
  const [mode, setMode] = useState<AppMode>("briefing");
  const [focusId, setFocusId] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const selectedRace = catalog.races.find((race) => race.id === form.raceId) ?? catalog.races[0];
  const selectedTeam = catalog.teams.find((team) => team.name === form.team) ?? catalog.teams[0];
  const parsedSeed = useMemo(() => parseSeed(form.seed), [form.seed]);
  const playback = usePlayback(simulation.result?.playback ?? null, form.playbackSpeed);

  useEffect(() => {
    if (!selectedRace) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      stints: defaultStints(prev.stops, selectedRace.laps),
    }));
  }, [selectedRace?.id, selectedRace?.laps]);

  useEffect(() => {
    if (catalog.teams.length && !catalog.teams.some((team) => team.name === form.team)) {
      setForm((prev) => ({ ...prev, team: catalog.teams[0].name }));
    }
  }, [catalog.teams, form.team]);

  const patchForm = useCallback((patch: Partial<BriefingForm>): void => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const onStopsChange = useCallback((stops: number): void => {
    setForm((prev) => ({
      ...prev,
      stops,
      stints: defaultStints(stops, selectedRace?.laps ?? 50),
    }));
  }, [selectedRace?.id, selectedRace?.laps]);

  const onSubmit = useCallback((): void => {
    if (!selectedRace || !selectedTeam) {
      return;
    }
    const total = stintTotal(form.stints);
    if (Math.abs(total - selectedRace.laps) > 3) {
      return;
    }
    if (parsedSeed.error) {
      return;
    }
    const config: SimConfig = {
      raceId: selectedRace.id,
      team: selectedTeam.name,
      gridPosition: form.gridPosition,
      stints: form.stints,
      weather: form.weather,
      safetyCarExpected: form.safetyCarExpected,
      iterations: form.iterations,
      seed: parsedSeed.value,
    };
    void simulation.run(config).then((response) => {
      if (response) {
        setMode("race");
        setFocusId(null);
      }
    });
  }, [form, parsedSeed, selectedRace, selectedTeam, simulation.run]);

  const onReset = useCallback((): void => {
    simulation.reset();
    setMode("briefing");
    setFocusId(null);
    playback.restart();
  }, [playback.restart, simulation]);

  const onScrub = useCallback((seconds: number): void => {
    setIsScrubbing(true);
    playback.scrubToTime(seconds);
  }, [playback.scrubToTime]);

  const onKeyScrub = useCallback((delta: number): void => {
    playback.skipLap(delta);
  }, [playback.skipLap]);

  useKeyboardPlayback({
    enabled: mode === "race" && Boolean(simulation.result),
    onTogglePause: playback.togglePause,
    onScrub: onKeyScrub,
  });

  useEffect(() => {
    if (!isScrubbing) {
      return undefined;
    }
    const timer = window.setTimeout(() => setIsScrubbing(false), 120);
    return () => window.clearTimeout(timer);
  }, [isScrubbing, playback.raceTime]);

  const snap = playback.snapshot;
  const canOpenRace = Boolean(simulation.result);

  return (
    <div
      className="app-shell"
      data-mode={mode}
      data-fullscreen={fullscreen.isFullscreen ? "true" : "false"}
    >
      <AppHeader
        mode={mode}
        canOpenRace={canOpenRace}
        seed={simulation.result?.seed ?? null}
        inSafetyCar={Boolean(snap?.inSc)}
        isRaining={Boolean(snap?.isRaining)}
        lastLap={Boolean(snap && simulation.result && snap.lap === simulation.result.playback.meta.totalLaps)}
        onModeChange={setMode}
        onReset={onReset}
        isFullscreen={fullscreen.isFullscreen}
        isFullscreenPending={fullscreen.isFullscreenPending}
        fullscreenError={fullscreen.fullscreenError}
        onFullscreenToggle={fullscreen.toggleFullscreen}
      />
      {mode === "briefing" || !simulation.result || !snap ? (
        <BriefingView
          form={form}
          races={catalog.races}
          teams={catalog.teams}
          selectedRace={selectedRace}
          selectedTeam={selectedTeam}
          catalogError={catalog.error}
          isLoading={catalog.isLoading}
          isRunning={simulation.isRunning}
          seedError={parsedSeed.error}
          simError={simulation.error}
          onChange={patchForm}
          onStopsChange={onStopsChange}
          onSubmit={onSubmit}
        />
      ) : null}
      {mode === "race" && simulation.result && snap ? (
        <RaceView
          result={simulation.result.playback}
          snap={snap}
          raceTime={playback.raceTime}
          duration={playback.duration}
          isPaused={playback.isPaused}
          speed={playback.speed}
          tyreModel={catalog.tyreModel}
          focusId={focusId}
          onFocus={setFocusId}
          onScrub={onScrub}
          onTogglePause={playback.togglePause}
          onSpeedChange={playback.setSpeed}
          onRestart={playback.restart}
          isScrubbing={isScrubbing}
          isRunningOverlay={simulation.isRunning}
          isFinish={playback.isComplete}
        />
      ) : null}
      {mode === "analysis" && simulation.result ? (
        <AnalysisView result={simulation.result} />
      ) : null}
      <DisclaimerFooter />
    </div>
  );
}
