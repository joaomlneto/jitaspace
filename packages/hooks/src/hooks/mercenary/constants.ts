import type { ESIScope } from "@jitaspace/esi-metadata";

/** The scope both Mercenary Tactical Operation routes are gated on. */
export const MERCENARY_TACTICAL_OPERATIONS_SCOPE: ESIScope =
  "esi-activities.read_character.v1";

/**
 * How long a listing or an operation's details count as fresh.
 *
 * ESI caches both routes for five minutes (`x-cache-age: 300`), so a refetch
 * sooner than that returns the same body. It would still spend tokens from the
 * `char-activity` rate-limit group, which allows 150 per character every 15
 * minutes — and the app's QueryClient refetches on every window focus by
 * default, once per operation.
 */
export const MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS = 5 * 60 * 1000;
