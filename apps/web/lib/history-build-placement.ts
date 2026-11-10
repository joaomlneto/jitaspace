import type { BuildServer } from "~/lib/history";

/**
 * Where the history views place a build, read from its `BuildDeployment` rows
 * (one per server whose build pointer has shown it).
 *
 * A build Tranquility has run is a Tranquility build, dated when Tranquility
 * got it, even when Singularity showed it first: CCP tests most patches there
 * before promoting the same build. Build 3682781 is the case this was written
 * for. It reached Singularity on 2026-11-09 and Tranquility on 2026-11-10.
 * Labelled by the server that first showed it, it was hidden as a test build,
 * and the expansion's patch notes with it.
 *
 * Any other build is placed on the server that first showed it, dated then. A
 * build without deployments (none exist today) has no server and no date,
 * which {@link isBuildInHistoryScope} keeps in scope.
 *
 * This replaces the deprecated `Build.server` / `Build.releasedAt` columns,
 * which hold the first server and date only and are dropped in
 * `@jitaspace/db-builds` 2.0. It is written against the row shape rather than
 * the package's `onTranquility` / `releasedAt` helpers so that tests mocking
 * `@jitaspace/db-builds` need not provide them.
 */
export interface BuildPlacement {
  /** When the build reached the server it is placed on, when known. */
  releasedAt: Date | null;
  server: BuildServer;
}

export interface DeploymentRow {
  server: "tranquility" | "singularity";
  firstSeenAt: Date | null;
}

/** The Prisma `select` on `Build` that {@link buildPlacement} reads. */
export const BUILD_PLACEMENT_SELECT = {
  deployments: { select: { server: true, firstSeenAt: true } },
} as const;

/** Undated first, then the earliest; Tranquility on a tie (the package's rule). */
function firstDeployment(
  deployments: readonly DeploymentRow[],
): DeploymentRow | undefined {
  let first: DeploymentRow | undefined;
  for (const d of deployments) {
    if (!first) {
      first = d;
      continue;
    }
    const a = d.firstSeenAt?.getTime() ?? -Infinity;
    const b = first.firstSeenAt?.getTime() ?? -Infinity;
    if (a < b || (a === b && d.server === "tranquility")) first = d;
  }
  return first;
}

export function buildPlacement(
  deployments: readonly DeploymentRow[] | null | undefined,
): BuildPlacement {
  const rows = deployments ?? [];
  const first = firstDeployment(rows);
  const tranquility = rows.find((d) => d.server === "tranquility");
  if (tranquility)
    return {
      // An undated Tranquility row falls back to the first-seen date.
      releasedAt: tranquility.firstSeenAt ?? first?.firstSeenAt ?? null,
      server: "tranquility",
    };
  return {
    releasedAt: first?.firstSeenAt ?? null,
    server: first?.server ?? null,
  };
}
