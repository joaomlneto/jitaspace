import { cacheLife } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { buildsDb } from "@jitaspace/db-builds";

/**
 * Every dungeon name the build-history database stores (`Entity.name`), as
 * `[dungeonId, name]`. dungeons.yaml names only the dungeons it describes; the
 * mission pockets it only refers to by id are named in the game client, and
 * jovespace reads those names into the history database with each new
 * Tranquility build. ~5,500 short rows, read in one query.
 *
 * Not SDE data, so it keeps its own `cacheLife` rather than `cacheSdeRead()`.
 * Throws on failure; {@link loadStoredDungeonNames} is the caller that
 * degrades.
 */
async function readStoredDungeonNames(): Promise<[number, string][]> {
  "use cache";
  cacheLife("days");
  const rows = await buildsDb.entity.findMany({
    where: { kind: "dungeon", name: { not: null } },
    select: { eveId: true, name: true },
  });
  return rows.flatMap((r) => (r.name ? [[r.eveId, r.name]] : []));
}

/**
 * {@link readStoredDungeonNames} as a map, or an empty one when the history
 * database fails: the names only fill in what the SDE leaves blank, so a page
 * renders fine without them. A failure is reported, and `connection()` keeps
 * that degraded render out of the page's cache, so the next request retries.
 */
export async function loadStoredDungeonNames(): Promise<Map<number, string>> {
  try {
    return new Map(await readStoredDungeonNames());
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "dungeon-names" } });
    const { connection } = await import("next/server");
    await connection();
    return new Map();
  }
}
