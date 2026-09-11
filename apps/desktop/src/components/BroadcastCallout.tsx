import type { JSX } from "react";
import type { BroadcastCallout as Callout } from "../utils/drama";

interface BroadcastCalloutProps {
  callout: Callout | null;
  lap: number;
}

export function BroadcastCallout({ callout, lap }: BroadcastCalloutProps): JSX.Element | null {
  if (!callout) {
    return null;
  }
  return (
    <div className={`broadcast-callout kind-${callout.kind}`} key={`${lap}-${callout.kind}-${callout.detail}`}>
      <div className="broadcast-kicker">{callout.title}</div>
      <div className="broadcast-detail">{callout.detail}</div>
    </div>
  );
}
