"use server";

import type { SdeIngestState } from "./types";
import type { DatabaseStatusResponse } from "~/lib/databaseStatus";
import type { TriggerApiRun, TriggerStatusResponse } from "~/lib/triggerStatus";
import { env } from "~/env";
import {
  buildDatabaseStatusResponse,
  DATABASE_STATUS_STALE_MINUTES,
} from "~/lib/databaseStatus";
import { prisma } from "~/lib/db";
import {
  buildTriggerStatusResponse,
  TRIGGER_STATUS_WINDOW_HOURS,
} from "~/lib/triggerStatus";
import { SDE_INGEST_KEY } from "./types";

const CACHE_TTL_MS = 30 * 1000;
const ERROR_CACHE_TTL_MS = 15 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;

// ---------------------------------------------------------------------------
// Trigger.dev background-jobs status
//
// Backed by the Trigger.dev Management API (GET /api/v1/runs), which lists
// runs directly. The secret key authenticates us and must never reach the
// client; this function only returns aggregated run data. When the key is
// unset the dashboard shows an "unavailable" state. Responses are cached
// briefly so status-page polling doesn't hammer the Trigger.dev API.
// ---------------------------------------------------------------------------

const TRIGGER_API_BASE_URL = env.TRIGGER_API_URL ?? "https://api.trigger.dev";
const TRIGGER_PAGE_SIZE = 100;
const TRIGGER_MAX_PAGES = 10;

let triggerCache: {
  expiresAt: number;
  payload: TriggerStatusResponse;
} | null = null;

const fetchTriggerRuns = async (fromIso: string): Promise<TriggerApiRun[]> => {
  const runs: TriggerApiRun[] = [];
  let after: string | undefined;

  for (let page = 0; page < TRIGGER_MAX_PAGES; page++) {
    const url = new URL("/api/v1/runs", TRIGGER_API_BASE_URL);
    url.searchParams.set("page[size]", String(TRIGGER_PAGE_SIZE));
    url.searchParams.set("filter[createdAt][from]", fromIso);
    if (after) url.searchParams.set("page[after]", after);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.TRIGGER_SECRET_KEY ?? ""}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Trigger.dev API responded with ${response.status}`);
    }

    const body = (await response.json()) as {
      data?: TriggerApiRun[] | null;
      pagination?: { next?: string | null } | null;
    };
    const items = body.data ?? [];
    runs.push(...items);

    const next = body.pagination?.next;
    if (!next || items.length === 0) break;
    after = next;
  }

  return runs;
};

const computeTriggerStatus = async (): Promise<TriggerStatusResponse> => {
  const fetchedAt = new Date();

  if (!env.TRIGGER_SECRET_KEY) {
    return buildTriggerStatusResponse({
      runs: [],
      fetchedAt,
      error: "TRIGGER_SECRET_KEY is not configured.",
    });
  }

  const fromIso = new Date(
    fetchedAt.getTime() - TRIGGER_STATUS_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  try {
    const runs = await fetchTriggerRuns(fromIso);
    return buildTriggerStatusResponse({ runs, fetchedAt });
  } catch (error) {
    return buildTriggerStatusResponse({
      runs: [],
      fetchedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export async function getTriggerStatus(): Promise<TriggerStatusResponse> {
  if (!triggerCache || Date.now() >= triggerCache.expiresAt) {
    const payload = await computeTriggerStatus();
    triggerCache = {
      payload,
      expiresAt:
        Date.now() + (payload.error ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS),
    };
  }
  return triggerCache.payload;
}

// ---------------------------------------------------------------------------
// Database status
//
// Reports the estimated row count of every table in the connected database for
// the status-page dashboard. The Prisma client must never reach the client;
// this function only returns aggregated, plain-number counts. Responses are
// cached for a few minutes so status-page polling does not hit the database on
// every load.
// ---------------------------------------------------------------------------

const DATABASE_CACHE_TTL_MS = DATABASE_STATUS_STALE_MINUTES * 60 * 1000;

/** A row-count estimate for one base table. */
interface TableRowStatistic {
  table_name: string;
  // Postgres reports these counters as BIGINT, which the pg adapter surfaces as
  // a string (or bigint) to avoid precision loss; number is tolerated too, and
  // a table with no statistics yet reports 0 (null is tolerated defensively).
  // `Number(... ?? 0)` normalizes all of these.
  estimated_row_count: string | number | bigint | null;
}

let databaseCache: {
  expiresAt: number;
  payload: DatabaseStatusResponse;
} | null = null;

const computeDatabaseStatus = async (): Promise<DatabaseStatusResponse> => {
  const fetchedAt = new Date();

  try {
    // Postgres keeps cheap, pre-computed row-count estimates in the catalog. We
    // deliberately use those instead of a `SELECT count(*)` per table: an exact
    // count would full-scan every table (some with millions of rows) on every
    // cache miss. The estimates are maintained automatically and are plenty for
    // a status dashboard (this is what psql's `\dt+` and most admin UIs show).
    //
    // Two sources, because neither alone is reliable:
    //   • `pg_stat_user_tables.n_live_tup` — maintained incrementally by the
    //     statistics collector on every write, so it tracks bulk loads that
    //     have not been ANALYZEd yet. Reset to 0 by `pg_stat_reset()` and on an
    //     unclean shutdown.
    //   • `pg_class.reltuples` — written by ANALYZE/VACUUM, so it survives a
    //     stats reset, but is `-1` on a table that has never been analyzed
    //     (Postgres 14+; it was 0 before).
    // `GREATEST(..., 0)` folds both together and clamps the `-1` sentinel away,
    // so a table reports 0 only when both sources genuinely have nothing.
    //
    // Both catalogs are world-readable, unlike CockroachDB's `crdb_internal`,
    // so this needs no elevated grants. `relkind = 'r'` keeps ordinary base
    // tables only, dropping views, sequences and indexes.
    const rows = await prisma.$queryRaw<TableRowStatistic[]>`
      SELECT
        c.relname AS table_name,
        GREATEST(
          COALESCE(s.n_live_tup, 0),
          COALESCE(c.reltuples, 0)::bigint,
          0
        ) AS estimated_row_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE c.relkind = 'r' AND n.nspname = 'public'
    `;

    return buildDatabaseStatusResponse({
      rows: rows.map((row) => ({
        name: row.table_name,
        rowCount: Number(row.estimated_row_count ?? 0),
      })),
      fetchedAt,
    });
  } catch (error) {
    return buildDatabaseStatusResponse({
      rows: [],
      fetchedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export async function getDatabaseStatus(): Promise<DatabaseStatusResponse> {
  if (!databaseCache || Date.now() >= databaseCache.expiresAt) {
    const payload = await computeDatabaseStatus();
    databaseCache = {
      payload,
      expiresAt:
        Date.now() +
        (payload.error ? ERROR_CACHE_TTL_MS : DATABASE_CACHE_TTL_MS),
    };
  }
  return databaseCache.payload;
}

// ---------------------------------------------------------------------------
// SDE ingest freshness
//
// `watch-sde` polls CCP's static-data archive hourly and, on a new build,
// triggers `ingest-sde-all`. That pipeline records which build it is loading
// under a Redis marker. Reading it back tells the status page which SDE build
// our database holds, which the page compares against CCP's latest.
// ---------------------------------------------------------------------------

/**
 * The SDE build our database holds. Null when nothing has been ingested yet, the
 * marker is unreadable, or Redis is unreachable — the status page renders a dash
 * for all three rather than failing.
 */
export async function getSdeIngestState(): Promise<SdeIngestState | null> {
  try {
    // Dynamic import: ~/lib/kv connects to Redis at module load time via
    // top-level await, so it must not be statically imported at the module
    // level or Next.js will attempt the connection during build-time config
    // collection.
    const { redis } = await import("~/lib/kv");
    const raw = await redis.get(SDE_INGEST_KEY);
    if (raw === null) return null;

    const { buildNumber, completedAt } = JSON.parse(raw) as Record<
      string,
      unknown
    >;
    if (typeof buildNumber !== "number") return null;

    return {
      buildNumber,
      completedAt:
        typeof completedAt === "number"
          ? new Date(completedAt).toISOString()
          : null,
    };
  } catch {
    return null;
  }
}
