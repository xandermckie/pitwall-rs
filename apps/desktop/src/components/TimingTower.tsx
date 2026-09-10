import type { LapSnapshot, TyreModel } from "../types/sim";
import type { JSX } from "react";
import { formatInterval } from "../utils/format";

interface TimingTowerProps {
  snap: LapSnapshot;
  tyreModel: TyreModel;
  focusId: number | null;
  onFocus: (id: number | null) => void;
}

export function TimingTower({
  snap,
  tyreModel,
  focusId,
  onFocus,
}: TimingTowerProps): JSX.Element {
  return (
    <aside className="panel">
      <div className="panel-hdr">Timing tower</div>
      <div className="tower-body">
        {snap.cars.map((car) => {
          const tyre = tyreModel[car.compound];
          const posCls = car.position === 1 ? "p1" : car.position === 2 ? "p2" : car.position === 3 ? "p3" : "";
          const rowCls = [
            car.isUser ? "user-car" : "",
            car.id === focusId ? "focused" : "",
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
                </div>
                <div className="t-team">{car.team}</div>
              </div>
              <div className="t-tyre" style={{ background: tyre?.color ?? "#888" }}>
                {tyre?.label ?? "?"}
              </div>
              <span className="t-gap">{formatInterval(car.interval, car.position)}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
