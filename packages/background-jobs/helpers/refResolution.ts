/**
 * Shared error handling for resolving referenced entities from ESI.
 *
 * ESI failures fall in two classes, and they must never be confused:
 * - transient (420 error-limited, 429, 5xx, timeouts, dropped connections): the
 *   entity exists; retry later. Writing a placeholder here stores a live entity as
 *   blank, which is how placeholder characters and corporations used to appear.
 * - not found (404): EVE no longer shows the entity. Fall back to other sources
 *   (eve-kill, ESI's name lookup), and only store a marker when nothing has it.
 */
import { isAxiosError } from "axios";

import { postUniverseNames } from "@jitaspace/esi-client";

/** Every third-party request identifies itself; ESI's admins check this. */
export const JITASPACE_USER_AGENT = "JitaSpace (https://www.jita.space)";

const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 120_000;
/**
 * How long to keep retrying ESI before giving up. Long enough to ride out EVE's
 * daily downtime (11:00 UTC, ESI answers 502/503/504 for ~15–30 min, sometimes
 * more); a fixed attempt count gave up after ~4 minutes and crashed a backfill.
 */
const MAX_RETRY_MS = 2 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Returned by {@link withEsiRetry} when ESI answers 404. */
export const NOT_FOUND = Symbol("NOT_FOUND");

/**
 * Run an ESI call, retrying transient failures for up to {@link MAX_RETRY_MS}.
 * Resolves to the call's result, or to {@link NOT_FOUND} on a 404. Throws once
 * retrying has gone on that long, so a run fails loudly instead of storing a
 * placeholder for an entity that exists.
 */
export const withEsiRetry = async <T>(
  label: string,
  call: () => Promise<T>,
): Promise<T | typeof NOT_FOUND> => {
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) return NOT_FOUND;
      // 400 means the request itself is wrong (e.g. an invalid ID); retrying
      // cannot help, so surface it.
      if (status === 400 || Date.now() - started >= MAX_RETRY_MS) throw error;
      const reset = isAxiosError(error)
        ? Number(error.response?.headers["x-esi-error-limit-reset"])
        : Number.NaN;
      const waitMs =
        status === 420 && Number.isFinite(reset)
          ? (reset + 1) * 1000
          : Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
      console.log(
        `${label}: ${status ?? (error instanceof Error ? error.message : "error")}, retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt})`,
      );
      await sleep(waitMs);
    }
  }
};

/**
 * After eve-kill fails every attempt, skip it for this long. Retrying it for each
 * deleted character cost ~4 minutes apiece during an eve-kill outage (2026-10-17).
 */
const EVE_KILL_SKIP_MS = 15 * 60 * 1000;
let eveKillDownUntil = 0;

/**
 * GET from eve-kill's API (https://eve-kill.com/api/...). Resolves to null on a
 * 404; retries transient failures up to {@link MAX_ATTEMPTS} times, then resolves
 * to null too, and skips eve-kill for {@link EVE_KILL_SKIP_MS} so an outage does not
 * stall every lookup. eve-kill is a fallback and does not share EVE's daily
 * downtime, so it does not get ESI's long retry window.
 */
export const fetchEveKill = async <T>(path: string): Promise<T | null> => {
  if (Date.now() < eveKillDownUntil) return null;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://eve-kill.com/api/${path}`, {
        headers: { "User-Agent": JITASPACE_USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      // network error or timeout: retry
    }
    if (attempt >= MAX_ATTEMPTS) {
      eveKillDownUntil = Date.now() + EVE_KILL_SKIP_MS;
      console.log(
        `eve-kill unreachable; skipping it for ${EVE_KILL_SKIP_MS / 60_000} minutes`,
      );
      return null;
    }
    await sleep(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt));
  }
};

/**
 * eve-kill stores most character birthdays as epoch seconds read as milliseconds
 * (they come out as 1970-01-1x); `1970-01-01T00:00:00Z` means unknown. Returns
 * the real date, or null when it cannot be recovered.
 */
export const eveKillBirthday = (iso: string | null | undefined) => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  if (ms >= Date.UTC(2003, 0, 1)) return new Date(ms);
  const asSeconds = ms * 1000;
  return asSeconds >= Date.UTC(2003, 4, 6) && asSeconds <= Date.now()
    ? new Date(asSeconds)
    : null;
};

/**
 * A name from ESI's /universe/names, which still resolves deleted characters.
 * Null when ESI does not know the ID at all.
 */
export const esiNameOf = async (id: number): Promise<string | null> => {
  const result = await withEsiRetry(`names ${id}`, () =>
    postUniverseNames([id]),
  );
  if (result === NOT_FOUND) return null;
  return result.data[0]?.name ?? null;
};
