import type { ESIScope } from "@jitaspace/esi-metadata";

/** The scope both Mercenary Tactical Operation routes are gated on. */
export const MERCENARY_TACTICAL_OPERATIONS_SCOPE: ESIScope =
  "esi-activities.read_character.v1";

/**
 * How long a listing or an operation's details count as fresh.
 *
 * ESI caches both routes for five minutes (`x-cache-age: 300`), so a refetch
 * sooner than that returns the same body. It would still spend tokens from the
 * `char-activity` rate-limit group, a bucket of 150 tokens per character every
 * 15 minutes (a successful request costs 2) — and the app's QueryClient
 * refetches on every window focus by default, once per operation.
 */
export const MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS = 5 * 60 * 1000;

/** The states an operation never leaves. */
const FINAL_STATES: ReadonlySet<string> = new Set([
  "Completed",
  "Expired",
  "Removed",
]);

/**
 * The `staleTime` of an operation's details: fresh for good once the
 * operation is over, since nothing about it can change again, so a long
 * listing of past operations does not spend the rate limit on every refetch.
 */
export const mercenaryTacticalOperationDetailsStaleTime = (query: {
  state: { data?: { data?: { state?: string } } };
}): number => {
  const state = query.state.data?.data?.state;
  return state !== undefined && FINAL_STATES.has(state)
    ? Number.POSITIVE_INFINITY
    : MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS;
};
