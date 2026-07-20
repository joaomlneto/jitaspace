"use server";

import type { DatabaseStatusResponse } from "~/lib/databaseStatus";
import type { TriggerApiRun, TriggerStatusResponse } from "~/lib/triggerStatus";
import { prisma } from "~/lib/db";
import { env } from "~/env";
import {
  buildDatabaseStatusResponse,
  DATABASE_STATUS_STALE_MINUTES,
} from "~/lib/databaseStatus";
import {
  buildTriggerStatusResponse,
  TRIGGER_STATUS_WINDOW_HOURS,
} from "~/lib/triggerStatus";

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
  // The pg adapter returns CockroachDB INT8 as a string to avoid precision
  // loss; bigint/number are tolerated too, and a table with no statistics yet
  // reports 0 (null is tolerated defensively). `Number(... ?? 0)` normalizes
  // all of these.
  estimated_row_count: string | number | bigint | null;
}

let databaseCache: {
  expiresAt: number;
  payload: DatabaseStatusResponse;
} | null = null;

const computeDatabaseStatus = async (): Promise<DatabaseStatusResponse> => {
  const fetchedAt = new Date();

  try {
    // CockroachDB exposes cheap, pre-computed row-count estimates from the
    // latest automatic table statistics. We deliberately use these instead of
    // a `SELECT count(*)` per table: an exact count would full-scan every
    // table (some with millions of rows) on the production cluster on every
    // cache miss. The estimates are refreshed automatically and are plenty for
    // a status dashboard (this is what CockroachDB's own DB Console shows).
    //
    // We read them via `SHOW TABLES`, whose `estimated_row_count` column comes
    // from those same statistics. We deliberately do NOT query
    // `crdb_internal.table_row_statistics` directly: as of CockroachDB v26 (and
    // on CockroachDB Cloud Basic/Standard) direct access to `crdb_internal` and
    // `system` is restricted for non-admin roles and fails with error 42501
    // ("Access to crdb_internal and system is restricted") unless the unsafe
    // `allow_unsafe_internals` session var is set. `SHOW` statements are
    // explicitly exempt from that gate, so they keep working in production.
    //
    // `SHOW TABLES` (no `FROM`) scopes to the connection's current database. We
    // wrap it as a table expression (`[SHOW TABLES]`) so we can keep only base
    // tables in the public schema (dropping views/sequences); `estimated_row_count`
    // is 0 for tables whose statistics have not been computed yet.
    const rows = await prisma.$queryRaw<TableRowStatistic[]>`
      SELECT table_name, estimated_row_count
      FROM [SHOW TABLES]
      WHERE type = 'table' AND schema_name = 'public'
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
