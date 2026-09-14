import type { SimResponse } from "../types/sim";
import type { JSX } from "react";
import { formatGap, formatPercent, formatPercentRange, formatPosition } from "../utils/format";
import { PositionHistogram } from "./PositionHistogram";

interface AnalysisViewProps {
  result: SimResponse;
}

export function AnalysisView({ result }: AnalysisViewProps): JSX.Element {
  const { playback, monteCarlo, seed } = result;
  const final = playback.laps[playback.laps.length - 1];
  const classification = final?.cars ?? [];

  return (
    <div className="analysis view">
      <section>
        <div className="section-kicker">Monte Carlo envelope</div>
        <h1 className="section-title">
          {playback.meta.race.name} · {playback.meta.team}
        </h1>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">This run</div>
            <div className="value">{formatPosition(playback.stats.finalPosition)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Median finish</div>
            <div className="value">{formatPosition(monteCarlo.medianPosition)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Expected pts</div>
            <div className="value">{monteCarlo.expectedPoints.toFixed(1)}</div>
          </div>
          <div className="stat-card">
            <div className="label">P(podium)</div>
            <div className="value">{formatPercent(monteCarlo.pPodium)}</div>
            <div className="label">
              95%: {formatPercentRange(monteCarlo.pPodiumCiLow, monteCarlo.pPodiumCiHigh)}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">P(win)</div>
            <div className="value">{formatPercent(monteCarlo.pWin)}</div>
            <div className="label">
              95%: {formatPercentRange(monteCarlo.pWinCiLow, monteCarlo.pWinCiHigh)}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">P(points)</div>
            <div className="value">{formatPercent(monteCarlo.pPoints)}</div>
            <div className="label">
              95%: {formatPercentRange(monteCarlo.pPointsCiLow, monteCarlo.pPointsCiHigh)}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">5th–95th</div>
            <div className="value">
              {formatPosition(monteCarlo.p05Position)}–{formatPosition(monteCarlo.p95Position)}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Position std dev</div>
            <div className="value">{monteCarlo.positionStdDev.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Position IQR</div>
            <div className="value">{monteCarlo.positionIqr.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Strategy score</div>
            <div className="value">{playback.stats.practicality.toFixed(0)}</div>
          </div>
        </div>
        <div className="chart-label">Lead-driver finish positions across {monteCarlo.iterations} runs</div>
        <PositionHistogram report={monteCarlo} thisRun={playback.stats.finalPosition} />
        <p className="assumptions" style={{ marginTop: 16 }}>
          Seed {seed}. Playback is the run nearest the median finish. Team haul this run:{" "}
          {playback.stats.teamPoints} pts. Gap to winner: {formatGap(playback.stats.gapToWinner)}.
          Safety-car rate {formatPercent(monteCarlo.scRate)}. Rain rate {formatPercent(monteCarlo.rainRate)}.
        </p>
        <p className="assumptions">
          Wilson 95% ranges describe Monte Carlo sampling uncertainty from finite iterations, not
          real-world model error.
        </p>
        <h2 className="section-kicker" style={{ marginTop: 24 }}>Assumptions</h2>
        <p className="assumptions">
          Lap times start from a 90s baseline scaled by constructor pace. Tyres warm up, then
          degrade linearly, then fall off a cliff. Constructor deg resistance reduces post-peak
          wear. Traffic adds dirty air without DRS and a small DRS closing bonus. Positions are
          cumulative time, not a separate overtake simulator. Weather and safety cars are
          probabilistic. This is not official Formula 1 data.
        </p>
      </section>
      <section>
        <div className="section-kicker">This-run classification</div>
        <h2 className="section-title">Chequered flag</h2>
        <table className="classification">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Driver</th>
              <th>Gap</th>
              <th>Tyre</th>
            </tr>
          </thead>
          <tbody>
            {classification.map((car) => (
              <tr key={car.id} className={car.isUser ? "user" : ""}>
                <td>{car.position}</td>
                <td>{car.driver}</td>
                <td>{formatGap(car.gap)}</td>
                <td>{car.compound}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
