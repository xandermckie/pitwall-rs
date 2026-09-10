import type { BriefingForm, Race, Team, Weather } from "../types/sim";
import type { JSX } from "react";
import { CircuitPreview } from "./CircuitPreview";
import { StintBuilder } from "./StintBuilder";

interface BriefingViewProps {
  form: BriefingForm;
  races: Race[];
  teams: Team[];
  selectedRace: Race | undefined;
  selectedTeam: Team | undefined;
  catalogError: string | null;
  isLoading: boolean;
  isRunning: boolean;
  simError: string | null;
  onChange: (patch: Partial<BriefingForm>) => void;
  onStopsChange: (stops: number) => void;
  onSubmit: () => void;
}

export function BriefingView({
  form,
  races,
  teams,
  selectedRace,
  selectedTeam,
  catalogError,
  isLoading,
  isRunning,
  simError,
  onChange,
  onStopsChange,
  onSubmit,
}: BriefingViewProps): JSX.Element {
  const canRun = !isLoading && !isRunning && Boolean(selectedRace) && Boolean(selectedTeam);

  return (
    <div className="briefing view">
      <section className="briefing-form">
        <div className="section-kicker">Session briefing</div>
        <h1 className="section-title">Configure the race model</h1>
        <p className={`status-line ${catalogError ? "error" : ""}`}>
          {catalogError
            ? catalogError
            : isLoading
              ? "Loading calendar and constructors..."
              : `${races.length} Grands Prix · ${teams.length} constructors`}
        </p>
        {simError ? <p className="status-line error">{simError}</p> : null}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="cfg-race">Grand Prix</label>
            <select
              id="cfg-race"
              value={form.raceId}
              onChange={(event) => onChange({ raceId: Number(event.target.value) })}
            >
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name} — {race.circuit} ({race.laps}L)
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cfg-team">Constructor</label>
            <select
              id="cfg-team"
              value={form.team}
              onChange={(event) => onChange({ team: event.target.value })}
            >
              {teams.map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cfg-grid">Grid (lead driver)</label>
            <input
              id="cfg-grid"
              type="number"
              min={1}
              max={20}
              value={form.gridPosition}
              onChange={(event) => onChange({ gridPosition: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="cfg-weather">Weather prior</label>
            <select
              id="cfg-weather"
              value={form.weather}
              onChange={(event) => onChange({ weather: event.target.value as Weather })}
            >
              <option value="DRY">Dry</option>
              <option value="MIXED">Mixed / changeable</option>
              <option value="WET">Wet</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cfg-sc">Safety car prior</label>
            <select
              id="cfg-sc"
              value={String(form.safetyCarExpected)}
              onChange={(event) => onChange({ safetyCarExpected: event.target.value === "true" })}
            >
              <option value="false">Neutral</option>
              <option value="true">Elevated (plan for it)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cfg-iter">Monte Carlo iterations</label>
            <select
              id="cfg-iter"
              value={form.iterations}
              onChange={(event) => onChange({ iterations: Number(event.target.value) })}
            >
              <option value={100}>100 — quick</option>
              <option value={500}>500 — default</option>
              <option value={1000}>1000 — tighter envelope</option>
              <option value={2000}>2000 — max</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cfg-seed">Seed (blank = random)</label>
            <input
              id="cfg-seed"
              value={form.seed}
              placeholder="optional"
              onChange={(event) => onChange({ seed: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cfg-speed">Playback speed</label>
            <select
              id="cfg-speed"
              value={form.playbackMs}
              onChange={(event) => onChange({ playbackMs: Number(event.target.value) })}
            >
              <option value={900}>Slow</option>
              <option value={400}>Normal</option>
              <option value={120}>Fast</option>
              <option value={30}>Ultra</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="cfg-stops">Stops</label>
            <select
              id="cfg-stops"
              value={form.stops}
              onChange={(event) => onStopsChange(Number(event.target.value))}
            >
              <option value={1}>1 stop — 2 stints</option>
              <option value={2}>2 stops — 3 stints</option>
              <option value={3}>3 stops — 4 stints</option>
            </select>
          </div>
          <div className="field full">
            <label>Lead driver stints</label>
            <StintBuilder
              stints={form.stints}
              raceLaps={selectedRace?.laps ?? 50}
              onChange={(stints) => onChange({ stints })}
            />
          </div>
        </div>

        {selectedTeam ? (
          <div className="driver-preview">
            <div className="driver-chip" style={{ borderLeftColor: selectedTeam.color }}>
              <strong>{selectedTeam.drivers[0]}</strong>
              <span>Lead — uses this strategy</span>
            </div>
            <div className="driver-chip" style={{ borderLeftColor: selectedTeam.color }}>
              <strong>{selectedTeam.drivers[1]}</strong>
              <span>Teammate — autonomous strategy</span>
            </div>
          </div>
        ) : null}

        <button className="btn btn-primary" type="button" disabled={!canRun} onClick={onSubmit}>
          {isRunning ? "Running envelope..." : "Run simulation"}
        </button>
      </section>

      <aside className="briefing-preview">
        <div className="section-kicker">Circuit</div>
        <h2 className="section-title">{selectedRace?.name ?? "Select a Grand Prix"}</h2>
        <CircuitPreview circuit={selectedRace?.circuit ?? "Barcelona"} />
        {selectedRace ? (
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>Laps</dt>
            <dd>{selectedRace.laps}</dd>
            <dt>Degradation</dt>
            <dd>{selectedRace.deg.toFixed(2)}</dd>
            <dt>Overtake index</dt>
            <dd>{selectedRace.overtake.toFixed(2)}</dd>
            <dt>SC prior</dt>
            <dd>{(selectedRace.scProb * 100).toFixed(0)}%</dd>
          </dl>
        ) : null}
        <div className="preview-panel" style={{ marginTop: 18 }}>
          <div className="section-kicker">Model notes</div>
          <p className="assumptions">
            The engine draws N independent races with tyre warm-up, linear degradation, a cliff,
            traffic, safety cars, and weather. Playback is the run whose lead-driver finish is
            closest to the median. This is a stochastic model, not physics or official F1 data.
          </p>
        </div>
      </aside>
    </div>
  );
}
