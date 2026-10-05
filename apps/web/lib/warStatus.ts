import type { WarStatus } from "~/components/Wars/WarRoom/types";
import type { EntityWarStatus } from "~/lib/warRecord";

/**
 * Where an unfinished war is in its lifecycle at `now`: declared but not yet
 * shooting, shooting, or shooting after one side withdrew. Shared by
 * `/active-wars` and the alliance page's Wars tab, so both label a war alike.
 */
export function deriveOngoingWarStatus(
  war: { startedDate: Date | null; retractedDate: Date | null },
  now: number,
): WarStatus {
  const started = war.startedDate?.getTime();
  if (started === undefined || started > now) return "pending";
  const retracted = war.retractedDate?.getTime();
  if (retracted !== undefined && retracted <= now) return "retracting";
  return "active";
}

/** {@link deriveOngoingWarStatus}, plus `finished` once the war has ended. */
export function deriveWarStatus(
  war: {
    startedDate: Date | null;
    finishedDate: Date | null;
    retractedDate: Date | null;
  },
  now: number,
): EntityWarStatus {
  const finished = war.finishedDate?.getTime();
  if (finished !== undefined && finished <= now) return "finished";
  return deriveOngoingWarStatus(war, now);
}
