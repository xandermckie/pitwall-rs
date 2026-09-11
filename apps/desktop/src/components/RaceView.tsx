import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import type { LapSnapshot, RaceResult, TyreModel } from "../types/sim";
import { buildLapDrama } from "../utils/drama";
import { detectLapEvents, type EventScanState, type RaceEvent } from "../utils/events";
import { BroadcastCallout } from "./BroadcastCallout";
import { DriverCards } from "./DriverCards";
import { EventsLog } from "./EventsLog";
import { InfoStrip } from "./InfoStrip";
import { LapScrubber } from "./LapScrubber";
import { LiveCharts } from "./LiveCharts";
import { StrategyPanel } from "./StrategyPanel";
import { TimingTower } from "./TimingTower";
import { TrackCanvas } from "./TrackCanvas";

interface RaceViewProps {
  result: RaceResult;
  snap: LapSnapshot;
  tyreModel: TyreModel;
  focusId: number | null;
  onFocus: (id: number | null) => void;
  onScrub: (lap: number) => void;
  isScrubbing: boolean;
  isRunningOverlay: boolean;
  isFinish: boolean;
}

export function RaceView({
  result,
  snap,
  tyreModel,
  focusId,
  onFocus,
  onScrub,
  isScrubbing,
  isRunningOverlay,
  isFinish,
}: RaceViewProps): JSX.Element {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const lead = snap.cars.find((car) => car.isLead);
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
    for (const lap of result.laps.slice(0, snap.lap)) {
      collected.push(...detectLapEvents(lap, result, tyreModel, state));
    }
    setEvents([...collected].reverse());
  }, [result, snap.lap, tyreModel]);

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
            disabled={false}
            onScrub={onScrub}
          />
          <LiveCharts
            gap={lead?.gap ?? 0}
            tyreDelta={lead?.tyreDelta ?? 0}
            lapTime={lead?.lapTime ?? 90}
            resetKey={`${result.meta.team}-${result.meta.grid}-${result.meta.totalLaps}`}
          />
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
