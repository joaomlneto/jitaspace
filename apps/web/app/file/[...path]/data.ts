import { cacheLife } from "next/cache";

import { buildsDb } from "@jitaspace/db-builds";

import type { FileEvent, FileHistory } from "~/lib/resource-pages";
import { readDiffBuilds } from "~/lib/history-build-axis";

/**
 * Every recorded change to client file `path` on Tranquility, oldest build
 * first; `null` when none was recorded.
 *
 * Singularity builds are left out: a test-server build is not what players
 * ran, and its size would read as a step in the live file's history. SDE-era
 * builds have no client files to begin with.
 *
 * The lookup is by `FileChange.path`, which needs the `FileChange_path_idx`
 * index on the history DB (see the schema) — without it this scans the table.
 * Cached per path for a day; throws on failure, like the other history reads.
 */
export async function getCachedFileHistory(
  path: string,
): Promise<FileHistory | null> {
  "use cache";
  cacheLife("days");

  const rows = await buildsDb.fileChange.findMany({
    where: { path },
    select: { diffId: true, op: true, size: true, hash: true },
  });
  if (rows.length === 0) return null;
  const builds = await readDiffBuilds(rows.map((r) => r.diffId));

  const events = rows.flatMap((r): FileEvent[] => {
    const at = builds.get(r.diffId);
    if (at?.server !== "tranquility") return [];
    return [
      {
        build: at.build,
        date: at.date,
        op: r.op,
        // BigInt in the schema; client files are far below 2^53 bytes.
        size: r.size === null ? null : Number(r.size),
        hash: r.hash,
      },
    ];
  });
  if (events.length === 0) return null;
  events.sort((a, b) => a.build - b.build);
  return { path, events };
}
