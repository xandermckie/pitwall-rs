import type { LapSnapshot, TyreModel } from "../types/sim";
import type { JSX } from "react";
import { BATTLE_INTERVAL_S } from "../utils/drama";
import { formatDelta, formatInterval } from "../utils/format";

interface TimingTowerProps {
  snap: LapSnapshot;
  tyreModel: TyreModel;
  focusId: number | null;
  onFocus: (id: number | null) => void;
  deltas: Map<number, number>;
  battleIds: Set<number>;
  overtakeIds: Set<number>;
}

export function TimingTower({
  snap,
  tyreModel,
  focusId,
  onFocus,
  deltas,
  battleIds,
  overtakeIds,
}: TimingTowerProps): JSX.Element {
  return (
    <aside className="panel">
      <div className="panel-hdr">Timing tower</div>
      <div className="tower-body">
        {snap.cars.map((car) => {
          const tyre = tyreModel[car.compound];
          const posCls = car.position === 1 ? "p1" : car.position === 2 ? "p2" : car.position === 3 ? "p3" : "";
          const delta = deltas.get(car.id);
          const inBattle = battleIds.has(car.id);
          const close = car.position > 1 && car.interval <= BATTLE_INTERVAL_S;
          const rowCls = [
            car.isUser ? "user-car" : "",
            car.id === focusId ? "focused" : "",
            delta !== undefined && delta > 0 ? "gaining" : "",
            delta !== undefined && delta < 0 ? "losing" : "",
            overtakeIds.has(car.id) ? "overtake" : "",
            inBattle ? "battle" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              className={`t-row ${rowCls}`}
              key={car.id}
              role="button"
              tabIndex={0}
              onClick={() => onFocus(focusId === car.id ? null : car.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(focusId === car.id ? null : car.id);
                }
              }}
            >
              <span className={`t-pos ${posCls}`}>{car.position}</span>
              <div className="t-bar" style={{ background: car.color, height: 18 }} />
              <div>
                <div className="t-driver">
                  {car.driver}
                  {car.drs ? <span className="drs-pill">DRS</span> : null}
                  {car.pitting ? <span className="pit-pill">IN</span> : null}
                </div>
                <div className="t-team">{car.team}</div>
              </div>
              <div className="t-tyre" style={{ background: tyre?.color ?? "#888" }}>
                {tyre?.label ?? "?"}
              </div>
              <span className={`t-delta ${delta && delta > 0 ? "up" : delta && delta < 0 ? "down" : ""}`}>
                {formatDelta(delta)}
              </span>
              <span className={`t-gap ${close ? "battle-gap" : ""}`}>
                {formatInterval(car.interval, car.position)}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
