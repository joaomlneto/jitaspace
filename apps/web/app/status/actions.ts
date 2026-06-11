"use server";

import type {
  InngestApiEvent,
  InngestStatusResponse,
} from "~/lib/inngestStatus";
import { env } from "~/env";
import {
  buildInngestStatusResponse,
  collectTerminalRuns,
  INNGEST_STATUS_WINDOW_HOURS,
} from "~/lib/inngestStatus";

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

    const last = items[items.length - 1];
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
