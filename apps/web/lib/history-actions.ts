"use server";

import { checkBotId } from "botid/server";

import type { BuildRangeChanges, EntityTimeline } from "~/lib/history";
import {
  getCachedBuildRangeChanges,
  getCachedEntityTimeline,
} from "~/lib/history-cache";

/**
 * Server functions backing the change-history viewer. Each queries the
 * standalone history database (@jitaspace/db-history) directly on the server
 * and returns the shaped, typed payload — there is no public REST surface.
 * Client components invoke these (e.g. as React Query `queryFn`s); Next.js
 * keeps the Prisma client and the connection string server-side.
 *
 * A change/file-change hangs off an immutable {@link BuildDiff} (an ordered
 * build pair), not a single build — so "changes in build N" is the diff whose
 * `toBuild` is N, and the build axis is recovered via `diff.toBuild`.
 *
 * "Not found" resolves to `null` so callers can render an empty state.
 *
 * Pages whose data does not depend on client state read it on the server
 * instead, with no action at all: the `/history` index
 * ({@link getCachedHistoryIndex}) and the per-build pages
 * (`app/history/build/[build]/data.ts`).
 */

/**
 * Vercel BotID gate for these actions.
 *
 * They are unauthenticated and expensive — each call can run heavy range SQL
 * against the history database and mint a permanent `"use cache"` entry — so an
 * automated caller could drive both database load and unbounded cache growth.
 * BotID classifies the session from headers its client script attaches, so the
 * invoking page route must be listed in `initBotId()` in
 * `instrumentation-client.ts`; if it is not, the headers are missing and this
 * fails closed. Local development always classifies as human.
 *
 * Callers treat `null` as "not found" and render an empty state, so refusing a
 * bot here degrades to an empty view rather than an error page.
 */
const isBot = async (): Promise<boolean> => {
  const { isBot } = await checkBotId();
  return isBot;
};

/**
 * Net decoded-SDE differences between two builds -- everything that is
 * different at build `to` vs. build `from`.
 *
 * Delegates to the immutable, cached {@link getCachedBuildRangeChanges} (keyed on
 * the pair, `cacheLife("max")`) so the expensive range aggregation runs once per
 * `(from, to)` and is served from cache afterwards.
 */
export async function getBuildRangeChanges(
  from: number,
  to: number,
): Promise<BuildRangeChanges | null> {
  if (await isBot()) return null;
  return getCachedBuildRangeChanges(from, to);
}

/**
 * Timeline for any entity kind ("type", "skin", "skinMaterial", …).
 *
 * Delegates to the day-cached {@link getCachedEntityTimeline} (keyed per
 * entityType+entityId) so the standalone history pages and the embedded History
 * tabs share one cache entry per entity rather than re-querying on every view.
 */
// Deliberately NOT behind `isBot()`. <EntityHistory> is embedded in the type
// page's History tab, so guarding this would force `/type/*` into the BotID
// protect list — which intercepts every Server Action on the app's busiest route
// family, including the root layout's EVE token refresh (see
// `instrumentation-client.ts`). It is also the cheaper of the two readers and
// only `cacheLife("days")`, so it expires rather than accumulating.
export async function getEntityTimeline(
  entityType: string,
  entityId: number,
): Promise<EntityTimeline | null> {
  return getCachedEntityTimeline(entityType, entityId);
}
