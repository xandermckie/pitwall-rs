import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import type { LiveLapSnapshot, RaceResult, TyreModel } from "../types/sim";
import {
  buildChartHistory,
  leadDriverCompletedLaps,
} from "../utils/chartHistory";
import { buildLapDrama } from "../utils/drama";
import {
  detectLapEvents,
  fullyCompletedFieldLaps,
  type EventScanState,
  type RaceEvent,
} from "../utils/events";
import { BroadcastCallout } from "./BroadcastCallout";
import { DriverCards } from "./DriverCards";
import { EventsLog } from "./EventsLog";
import { InfoStrip } from "./InfoStrip";
import { LapScrubber } from "./LapScrubber";
import { LiveCharts } from "./LiveCharts";
import { PlaybackControls } from "./PlaybackControls";
import { StrategyPanel } from "./StrategyPanel";
import { TimingTower } from "./TimingTower";
import { TrackCanvas } from "./TrackCanvas";

interface RaceViewProps {
  result: RaceResult;
  snap: LiveLapSnapshot;
  raceTime: number;
  duration: number;
  isPaused: boolean;
  speed: number;
  tyreModel: TyreModel;
  focusId: number | null;
  onFocus: (id: number | null) => void;
  onScrub: (seconds: number) => void;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
  isScrubbing: boolean;
  isRunningOverlay: boolean;
  isFinish: boolean;
}

export function RaceView({
  result,
  snap,
  raceTime,
  duration,
  isPaused,
  speed,
  tyreModel,
  focusId,
  onFocus,
  onScrub,
  onTogglePause,
  onSpeedChange,
  onRestart,
  isScrubbing,
  isRunningOverlay,
  isFinish,
}: RaceViewProps): JSX.Element {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const completedLeadLaps = leadDriverCompletedLaps(snap);
  const completedFieldLaps = fullyCompletedFieldLaps(snap);
  const chartHistory = useMemo(
    () => buildChartHistory(result, completedLeadLaps),
    [completedLeadLaps, result],
  );
  const prevSnap = useMemo(() => {
    const index = result.laps.findIndex((lap) => lap.lap === snap.lap);
    return index > 0 ? result.laps[index - 1] : null;
  }, [result, snap.lap]);
  const drama = useMemo(
    () =>
      buildLapDrama(prevSnap, snap, {
        totalLaps: result.meta.totalLaps,
        isFinish,
      }),
    [prevSnap, snap, result.meta.totalLaps, isFinish],
  );
  const overtakeIds = useMemo(() => [...drama.overtakeIds], [drama]);
  const battleIds = useMemo(() => [...drama.battleIds], [drama]);

  useEffect(() => {
    setEvents([]);
  }, [result]);

  useEffect(() => {
    const state: EventScanState = { positions: new Map(), leader: null };
    const collected: RaceEvent[] = [];
    for (const lap of result.laps.slice(0, completedFieldLaps)) {
      collected.push(...detectLapEvents(lap, result, tyreModel, state));
    }
    setEvents([...collected].reverse());
  }, [completedFieldLaps, result, tyreModel]);

  return (
    <div className="race-layout view">
      <InfoStrip
        snap={snap}
        totalLaps={result.meta.totalLaps}
        battleCount={drama.battles.length}
        isFinish={isFinish}
      />
      <div className="race-body">
        <TimingTower
          snap={snap}
          tyreModel={tyreModel}
          focusId={focusId}
          onFocus={onFocus}
          deltas={drama.deltas}
          battleIds={drama.battleIds}
          overtakeIds={drama.overtakeIds}
        />
        <section className="centre">
          <div style={{ position: "relative", minHeight: 0 }}>
            <TrackCanvas
              circuit={result.meta.race.circuit}
              snap={snap}
              focusId={focusId}
              scrub={isScrubbing}
              overtakeIds={overtakeIds}
              battleIds={battleIds}
              isFinish={isFinish}
              totalLaps={result.meta.totalLaps}
            />
            <BroadcastCallout callout={drama.callout} lap={snap.lap} />
            <div className={`compute-overlay ${isRunningOverlay ? "" : "hidden"}`}>
              <div>Computing Monte Carlo envelope</div>
              <div className="assumptions">Independent seeded races in Rust</div>
            </div>
          </div>
          <LapScrubber
            lap={snap.lap}
            total={result.laps.length}
            raceTime={raceTime}
            duration={duration}
            disabled={false}
            onScrub={onScrub}
          />
          <PlaybackControls
            isPaused={isPaused}
            speed={speed}
            raceTime={raceTime}
            onTogglePause={onTogglePause}
            onSpeedChange={onSpeedChange}
            onRestart={onRestart}
          />
          <LiveCharts history={chartHistory} />
        </section>
        <aside className="panel">
          <StrategyPanel
            stints={result.meta.stints}
            totalLaps={result.meta.totalLaps}
            currentLap={snap.lap}
            tyreModel={tyreModel}
          />
          <DriverCards snap={snap} battles={drama.battles} deltas={drama.deltas} />
          <EventsLog events={events} />
        </aside>
      </div>
    </div>
  );
}
