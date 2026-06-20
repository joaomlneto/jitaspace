"use server";

import type { DatabaseStatusResponse } from "~/lib/databaseStatus";
import type {
  InngestApiEvent,
  InngestStatusResponse,
} from "~/lib/inngestStatus";
import type { TriggerApiRun, TriggerStatusResponse } from "~/lib/triggerStatus";
import { prisma } from "~/lib/db";
import { env } from "~/env";
import {
  buildDatabaseStatusResponse,
  DATABASE_STATUS_STALE_MINUTES,
} from "~/lib/databaseStatus";
import {
  buildInngestStatusResponse,
  collectTerminalRuns,
  INNGEST_STATUS_WINDOW_HOURS,
} from "~/lib/inngestStatus";
import {
  buildTriggerStatusResponse,
  TRIGGER_STATUS_WINDOW_HOURS,
} from "~/lib/triggerStatus";

/**
 * Server function summarizing Inngest background-job runs for the status
 * page, built from the Inngest REST API (see lib/inngestStatus.ts for the
 * approach). There is deliberately no public route for this — the data is
 * only reachable through this server function. Responses are cached briefly
 * so status-page polling doesn't hammer the Inngest API.
 *
 * The signing key authenticates us to the Inngest API and must never reach
 * the client; this function only returns aggregated run data.
 */

const CACHE_TTL_MS = 30 * 1000;
const ERROR_CACHE_TTL_MS = 15 * 1000;
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 10 * 1000;

// The hosted API in production; the local `inngest dev` server otherwise.
const INNGEST_API_BASE_URL =
  env.INNGEST_BASE_URL ??
  (env.NODE_ENV === "production"
    ? "https://api.inngest.com"
    : "http://localhost:8288");

let cache: { expiresAt: number; payload: InngestStatusResponse } | null = null;

const apiFetch = async (path: string, params?: Record<string, string>) => {
  const url = new URL(path, INNGEST_API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.INNGEST_SIGNING_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Inngest API responded with ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const fetchEvents = async ({
  name,
  receivedAfter,
  maxPages,
}: {
  name: string;
  receivedAfter: string;
  maxPages: number;
}): Promise<InngestApiEvent[]> => {
  const events: InngestApiEvent[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const body = (await apiFetch("/v1/events", {
      received_after: receivedAfter,
      limit: String(PAGE_SIZE),
      name,
      ...(cursor ? { cursor } : {}),
    })) as { data?: InngestApiEvent[] | null };

    const items = body.data ?? [];
    events.push(...items);

    const last = items.at(-1);
    if (items.length < PAGE_SIZE || !last?.internal_id) break;
    cursor = last.internal_id;
  }

  return events;
};

const computeStatus = async (): Promise<InngestStatusResponse> => {
  const fetchedAt = new Date();
  const windowStart = new Date(
    fetchedAt.getTime() - INNGEST_STATUS_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  try {
    // The finished sweep is the backbone; the failed/cancelled sweeps only
    // add error detail, so those degrade to empty on failure instead of
    // failing the response.
    const [finished, failed, cancelled] = await Promise.all([
      fetchEvents({
        name: "inngest/function.finished",
        receivedAfter: windowStart,
        maxPages: 5,
      }),
      fetchEvents({
        name: "inngest/function.failed",
        receivedAfter: windowStart,
        maxPages: 2,
      }).catch(() => []),
      fetchEvents({
        name: "inngest/function.cancelled",
        receivedAfter: windowStart,
        maxPages: 1,
      }).catch(() => []),
    ]);

    const terminalRuns = collectTerminalRuns([
      ...finished,
      ...failed,
      ...cancelled,
    ]);

    return buildInngestStatusResponse({ terminalRuns, fetchedAt });
  } catch (error) {
    return buildInngestStatusResponse({
      terminalRuns: new Map(),
      fetchedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export async function getInngestStatus(): Promise<InngestStatusResponse> {
  if (!cache || Date.now() >= cache.expiresAt) {
    const payload = await computeStatus();
    cache = {
      payload,
      expiresAt:
        Date.now() + (payload.error ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS),
    };
  }
  return cache.payload;
}

// ---------------------------------------------------------------------------
// Trigger.dev background-jobs status
//
// Mirrors getInngestStatus but backed by the Trigger.dev Management API
// (GET /api/v1/runs), which lists runs directly. The secret key authenticates
// us and must never reach the client; this function only returns aggregated
// run data. When the key is unset the dashboard shows an "unavailable" state.
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
  // loss; bigint/number are tolerated too, and the LEFT JOIN yields null for a
  // table with no statistics yet. `Number(... ?? 0)` normalizes all of these.
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
    // `crdb_internal.table_row_statistics` is cluster-wide, so we join against
    // `crdb_internal.tables` and scope to the connected database's public
    // schema to list exactly our application's tables. The LEFT JOIN keeps
    // tables that have no statistics yet (estimate comes back null → 0).
    const rows = await prisma.$queryRaw<TableRowStatistic[]>`
      SELECT t.name AS table_name, s.estimated_row_count AS estimated_row_count
      FROM crdb_internal.tables AS t
      LEFT JOIN crdb_internal.table_row_statistics AS s ON s.table_id = t.table_id
      WHERE t.database_name = current_database()
        AND t.schema_name = 'public'
        AND t.state = 'PUBLIC'
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
