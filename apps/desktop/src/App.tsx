import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { AnalysisView } from "./components/AnalysisView";
import { AppHeader } from "./components/AppHeader";
import { BriefingView } from "./components/BriefingView";
import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { RaceView } from "./components/RaceView";
import { useCatalog } from "./hooks/useCatalog";
import { useKeyboardPlayback } from "./hooks/useKeyboardPlayback";
import { usePlayback } from "./hooks/usePlayback";
import { useSimulation } from "./hooks/useSimulation";
import type { AppMode, BriefingForm, SimConfig } from "./types/sim";
import { defaultStints, stintTotal } from "./utils/stints";
import "./styles/app.css";

const INITIAL: BriefingForm = {
  raceId: 5,
  team: "McLaren",
  gridPosition: 2,
  weather: "DRY",
  safetyCarExpected: false,
  iterations: 500,
  seed: "",
  stops: 2,
  stints: defaultStints(2, 66),
  playbackMs: 400,
};

export default function App(): JSX.Element {
  const catalog = useCatalog();
  const simulation = useSimulation();
  const [form, setForm] = useState<BriefingForm>(INITIAL);
  const [mode, setMode] = useState<AppMode>("briefing");
  const [focusId, setFocusId] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const selectedRace = catalog.races.find((race) => race.id === form.raceId) ?? catalog.races[0];
  const selectedTeam = catalog.teams.find((team) => team.name === form.team) ?? catalog.teams[0];
  const playback = usePlayback(simulation.result?.playback ?? null, form.playbackMs);

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
    const seedValue = form.seed.trim() === "" ? null : Number(form.seed);
    const config: SimConfig = {
      raceId: selectedRace.id,
      team: selectedTeam.name,
      gridPosition: form.gridPosition,
      stints: form.stints,
      weather: form.weather,
      safetyCarExpected: form.safetyCarExpected,
      iterations: form.iterations,
      seed: seedValue !== null && Number.isFinite(seedValue) ? seedValue : null,
    };
    void simulation.run(config).then((response) => {
      if (response) {
        setMode("race");
        setFocusId(null);
      }
    });
  }, [form, selectedRace, selectedTeam, simulation.run]);

  const onReset = useCallback((): void => {
    simulation.reset();
    setMode("briefing");
    setFocusId(null);
    playback.restart();
  }, [playback, simulation]);

  const onScrub = useCallback((lap: number): void => {
    setIsScrubbing(true);
    playback.scrubTo(Math.max(0, lap - 1));
  }, [playback]);

  const onKeyScrub = useCallback((delta: number): void => {
    const next = Math.min(
      Math.max(0, playback.index + delta),
      (simulation.result?.playback.laps.length ?? 1) - 1,
    );
    playback.scrubTo(next);
  }, [playback, simulation.result]);

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
  }, [isScrubbing, playback.index]);

  const snap = playback.snapshot;
  const canOpenRace = Boolean(simulation.result);

  const headerSpeed = useMemo(() => playback.speedMs, [playback.speedMs]);

  return (
    <div className="app-shell">
      <AppHeader
        mode={mode}
        canOpenRace={canOpenRace}
        seed={simulation.result?.seed ?? null}
        inSafetyCar={Boolean(snap?.inSc)}
        isRaining={Boolean(snap?.isRaining)}
        lastLap={Boolean(snap && simulation.result && snap.lap === simulation.result.playback.meta.totalLaps)}
        onModeChange={setMode}
        onPause={playback.togglePause}
        isPaused={playback.isPaused}
        pauseDisabled={!canOpenRace || mode !== "race"}
        speedMs={headerSpeed}
        onSpeedChange={playback.setSpeedMs}
        onReset={onReset}
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
          tyreModel={catalog.tyreModel}
          focusId={focusId}
          onFocus={setFocusId}
          onScrub={onScrub}
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
