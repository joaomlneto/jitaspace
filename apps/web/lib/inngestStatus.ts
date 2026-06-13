/**
 * Types and pure aggregation logic for the Inngest background-jobs status
 * server function (`app/status/actions.ts`) and the status-page dashboard.
 *
 * The public Inngest REST API has no "list functions" or "list all runs"
 * endpoint, so run state is reconstructed from the
 * `inngest/function.finished|failed|cancelled` system events (queryable via
 * `GET /v1/events?name=...`). This is deliberately data-driven: only jobs
 * with at least one run inside the window appear, display names are derived
 * from function slugs, and currently-running jobs are not detected (that
 * would require a static event→function mapping; see git history /
 * the eve-scrape registry if richer UX is ever wanted).
 *
 * Run IDs are ULIDs whose first 10 characters encode the time the run was
 * queued; durations are derived from that, so they include time spent queued.
 *
 * Keep this module free of server-only imports — client components import
 * types from it.
 */

export const INNGEST_STATUS_WINDOW_HOURS = 24;
export const MAX_RECENT_RUNS_PER_JOB = 10;

/** Run statuses as reported by the Inngest API. */
export type InngestRunStatus = "Running" | "Completed" | "Failed" | "Cancelled";

export interface InngestRunSummary {
  runId: string;
  status: InngestRunStatus;
  /** When the run was queued, in ms since epoch (decoded from the run ULID). */
  queuedAt: number | null;
  /** When the run reached a terminal state, in ms since epoch. */
  endedAt: number | null;
  /** `endedAt - queuedAt`; includes time spent waiting in the queue. */
  durationMs: number | null;
  errorName?: string;
  errorMessage?: string;
}

export interface InngestJobStatus {
  /** Fully-qualified function slug as reported by the Inngest API. */
  id: string;
  /** Display name derived from the slug (e.g. "Scrape ESI Alliances"). */
  name: string;
  /** Most recent run within the window. */
  lastRun: InngestRunSummary | null;
  counts: {
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  /** Newest-first, capped at MAX_RECENT_RUNS_PER_JOB. */
  recentRuns: InngestRunSummary[];
}

export interface InngestStatusResponse {
  fetchedAt: string;
  windowHours: number;
  /** Set when the Inngest API could not be reached; jobs will be empty. */
  error?: string;
  /** Only jobs with at least one run within the window. */
  jobs: InngestJobStatus[];
  totals: {
    /** Jobs observed within the window. */
    jobs: number;
    runs: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

// ---------------------------------------------------------------------------
// Raw Inngest REST API shapes (the subset we consume)
// ---------------------------------------------------------------------------

export interface InngestApiEvent {
  internal_id: string;
  name: string;
  ts?: number | null;
  received_at?: string | null;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Decode the millisecond timestamp encoded in a ULID's first 10 characters. */
export const ulidTimestamp = (ulid: string): number | null => {
  if (ulid.length < 10) return null;
  let timestamp = 0;
  for (const char of ulid.slice(0, 10).toUpperCase()) {
    const index = ULID_ALPHABET.indexOf(char);
    if (index === -1) return null;
    timestamp = timestamp * 32 + index;
  }
  return timestamp;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const eventTimestamp = (event: InngestApiEvent): number | null => {
  if (typeof event.ts === "number" && event.ts > 0) return event.ts;
  if (event.received_at) {
    const parsed = Date.parse(event.received_at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
};

/** Inngest prefixes function slugs with the app ID (see eve-scrape/client.ts). */
const APP_SLUG_PREFIX = "jitaspace-";

const ACRONYMS: Record<string, string> = {
  esi: "ESI",
  sde: "SDE",
  npc: "NPC",
  ids: "IDs",
};

/**
 * Best-effort display name for a function slug, e.g.
 * `jitaspace-scrape-esi-alliances` → "Scrape ESI Alliances". The API only
 * exposes slugs; the human-readable names live in the function definitions,
 * which this module must not import (see eve-scrape's import side effects).
 */
export const jobNameFromSlug = (slug: string): string => {
  const id = slug.startsWith(APP_SLUG_PREFIX)
    ? slug.slice(APP_SLUG_PREFIX.length)
    : slug;
  return id
    .split("-")
    .filter(Boolean)
    .map(
      (word) => ACRONYMS[word] ?? word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
};

// ---------------------------------------------------------------------------
// Terminal runs from system events
// ---------------------------------------------------------------------------

export interface TerminalRunRecord {
  runId: string;
  functionSlug: string;
  status: Exclude<InngestRunStatus, "Running">;
  queuedAt: number | null;
  endedAt: number | null;
  errorName?: string;
  errorMessage?: string;
}

const TERMINAL_STATUSES = new Set(["Completed", "Failed", "Cancelled"]);

/**
 * Build a map of terminal runs (keyed by run ID) from
 * `inngest/function.finished|failed|cancelled` system events. Events for the
 * same run are merged; Failed/Cancelled take precedence over Completed and
 * error details are kept from whichever event carries them.
 */
export const collectTerminalRuns = (
  events: InngestApiEvent[],
): Map<string, TerminalRunRecord> => {
  const runs = new Map<string, TerminalRunRecord>();

  for (const event of events) {
    const data = asRecord(event.data);
    if (!data) continue;
    const runId = asString(data.run_id);
    const functionSlug = asString(data.function_id);
    if (!runId || !functionSlug) continue;

    const error = asRecord(data.error);
    let status: TerminalRunRecord["status"];
    switch (event.name) {
      case "inngest/function.failed":
        status = "Failed";
        break;
      case "inngest/function.cancelled":
        status = "Cancelled";
        break;
      case "inngest/function.finished": {
        const reported = asString(asRecord(data._inngest)?.status);
        status =
          reported && TERMINAL_STATUSES.has(reported)
            ? (reported as TerminalRunRecord["status"])
            : error
              ? "Failed"
              : "Completed";
        break;
      }
      default:
        continue;
    }

    const existing = runs.get(runId);
    const record: TerminalRunRecord = existing ?? {
      runId,
      functionSlug,
      status,
      queuedAt: ulidTimestamp(runId),
      endedAt: eventTimestamp(event),
    };

    if (existing) {
      // Failed/Cancelled beats Completed; keep the latest end timestamp.
      if (status !== "Completed") record.status = status;
      const endedAt = eventTimestamp(event);
      if (endedAt && (!record.endedAt || endedAt > record.endedAt)) {
        record.endedAt = endedAt;
      }
    }

    if (error) {
      record.errorName ??= asString(error.name);
      record.errorMessage ??= asString(error.message);
    }

    runs.set(runId, record);
  }

  return runs;
};

// ---------------------------------------------------------------------------
// Response assembly
// ---------------------------------------------------------------------------

const runSortKey = (run: InngestRunSummary) => run.endedAt ?? run.queuedAt ?? 0;

export const buildInngestStatusResponse = ({
  terminalRuns,
  fetchedAt,
  windowHours = INNGEST_STATUS_WINDOW_HOURS,
  error,
}: {
  terminalRuns: Map<string, TerminalRunRecord>;
  fetchedAt: Date;
  windowHours?: number;
  error?: string;
}): InngestStatusResponse => {
  const runsBySlug = new Map<string, InngestRunSummary[]>();
  for (const run of terminalRuns.values()) {
    const summary: InngestRunSummary = {
      runId: run.runId,
      status: run.status,
      queuedAt: run.queuedAt,
      endedAt: run.endedAt,
      durationMs:
        run.endedAt !== null && run.queuedAt !== null
          ? Math.max(0, run.endedAt - run.queuedAt)
          : null,
      ...(run.errorName ? { errorName: run.errorName } : {}),
      ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
    };
    runsBySlug.set(run.functionSlug, [
      ...(runsBySlug.get(run.functionSlug) ?? []),
      summary,
    ]);
  }

  const jobs: InngestJobStatus[] = [...runsBySlug.entries()]
    .map(([slug, runs]) => {
      const sorted = [...runs].sort((a, b) => runSortKey(b) - runSortKey(a));

      return {
        id: slug,
        name: jobNameFromSlug(slug),
        lastRun: sorted[0] ?? null,
        counts: {
          completed: sorted.filter((run) => run.status === "Completed").length,
          failed: sorted.filter((run) => run.status === "Failed").length,
          cancelled: sorted.filter((run) => run.status === "Cancelled").length,
          total: sorted.length,
        },
        recentRuns: sorted.slice(0, MAX_RECENT_RUNS_PER_JOB),
      };
    })
    .sort((a, b) => {
      const aKey = a.lastRun ? runSortKey(a.lastRun) : 0;
      const bKey = b.lastRun ? runSortKey(b.lastRun) : 0;
      if (aKey !== bKey) return bKey - aKey;
      return a.id.localeCompare(b.id);
    });

  const totals = jobs.reduce(
    (acc, job) => {
      acc.runs += job.counts.total;
      acc.completed += job.counts.completed;
      acc.failed += job.counts.failed;
      acc.cancelled += job.counts.cancelled;
      return acc;
    },
    { jobs: jobs.length, runs: 0, completed: 0, failed: 0, cancelled: 0 },
  );

  return {
    fetchedAt: fetchedAt.toISOString(),
    windowHours,
    ...(error ? { error } : {}),
    jobs,
    totals,
  };
};
