import { buildsDb } from "@jitaspace/db-builds";

import type { HistoryServer } from "~/lib/resource-pages";

/** Where a diff sits on the timeline: the build it leads to. */
export interface DiffBuild {
  build: number;
  /** Release date (YYYY-MM-DD), when known. */
  date: string | null;
  server: HistoryServer;
}

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * The build each of `diffIds` leads to, read with two point lookups rather
 * than through the change → diff → build relations: those can dangle while the
 * shared history DB is mid-migration, and Prisma types a missing relation as
 * non-null, so traversing one crashes. A diff without a row is simply absent
 * from the map; a build without a row has a null date and server.
 */
export async function readDiffBuilds(
  diffIds: readonly number[],
): Promise<Map<number, DiffBuild>> {
  const ids = [...new Set(diffIds)];
  if (ids.length === 0) return new Map();
  const diffs = await buildsDb.buildDiff.findMany({
    where: { id: { in: ids } },
    select: { id: true, toBuild: true },
  });
  const builds = await buildsDb.build.findMany({
    where: { buildNumber: { in: [...new Set(diffs.map((d) => d.toBuild))] } },
    select: { buildNumber: true, releasedAt: true, server: true },
  });
  const buildOf = new Map(builds.map((b) => [b.buildNumber, b]));
  return new Map(
    diffs.map((d) => {
      const build = buildOf.get(d.toBuild);
      return [
        d.id,
        {
          build: d.toBuild,
          date: ymd(build?.releasedAt ?? null),
          server: build?.server ?? null,
        },
      ];
    }),
  );
}
