import type { RaceEvent } from "../utils/events";
import type { JSX } from "react";

interface EventsLogProps {
  events: RaceEvent[];
}

const KIND_LABEL: Record<RaceEvent["kind"], string> = {
  sc: "SC",
  "sc-end": "GREEN",
  rain: "RAIN",
  pit: "PIT",
  gain: "GAIN",
  drop: "DROP",
  fl: "FL",
};

export function EventsLog({ events }: EventsLogProps): JSX.Element {
  return (
    <>
      <div className="panel-hdr">Race events</div>
      <div className="events-log">
        {events.map((event) => (
          <div className="ev" key={event.id}>
            <span className="ev-lap">L{event.lap}</span>
            <span className="ev-kind">{KIND_LABEL[event.kind]}</span>
            <span>{event.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}
