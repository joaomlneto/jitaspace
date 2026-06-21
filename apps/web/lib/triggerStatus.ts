/**
 * Types and pure aggregation logic for the Trigger.dev background-jobs status
 * server function (`app/status/actions.ts`) and the status-page dashboard.
 *
 * The Trigger.dev Management API lists runs directly (`GET /api/v1/runs`), so
 * this is a straightforward group-by-task aggregation. It is deliberately
 * data-driven: only tasks with at least one run inside the window appear, and
 * display names are derived from task ids (which equal the job ids).
 *
 * Keep this module free of server-only imports — client components import
 * types from it.
 */

export const TRIGGER_STATUS_WINDOW_HOURS = 24;
export const MAX_RECENT_RUNS_PER_JOB = 10;

/** The dashboard's four run buckets. */
export type TriggerRunStatus = "Running" | "Completed" | "Failed" | "Cancelled";

export interface TriggerRunSummary {
  runId: string;
  status: TriggerRunStatus;
  /** When the run was created/queued, in ms since epoch. */
  queuedAt: number | null;
  /** When the run finished, in ms since epoch (null while running). */
  endedAt: number | null;
  durationMs: number | null;
  isTest?: boolean;
}

export interface TriggerJobStatus {
  /** Task identifier, which equals the platform-agnostic job id. */
  id: string;
  /** Display name derived from the id (e.g. "Scrape ESI Alliances"). */
  name: string;
  lastRun: TriggerRunSummary | null;
  counts: {
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  /** Newest-first, capped at MAX_RECENT_RUNS_PER_JOB. */
  recentRuns: TriggerRunSummary[];
}

export interface TriggerStatusResponse {
  fetchedAt: string;
  windowHours: number;
  /** Set when the Trigger.dev API could not be reached (or no key configured). */
  error?: string;
  jobs: TriggerJobStatus[];
  totals: {
    jobs: number;
    runs: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

/** The subset of the Trigger.dev `GET /api/v1/runs` run shape we consume. */
export interface TriggerApiRun {
  id: string;
  taskIdentifier: string;
  status: string;
  createdAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  durationMs?: number | null;
  isTest?: boolean;
}

const ACRONYMS: Record<string, string> = {
  esi: "ESI",
  sde: "SDE",
  npc: "NPC",
  ids: "IDs",
  r2z2: "R2Z2",
};

/** e.g. "scrape-esi-alliances" → "Scrape ESI Alliances". Task ids equal job ids. */
export const jobNameFromId = (id: string): string =>
  id
    .split("-")
    .filter(Boolean)
    .map(
      (word) => ACRONYMS[word] ?? word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

/** Map a Trigger.dev run status to one of the dashboard's four buckets. */
export const mapTriggerStatus = (status: string): TriggerRunStatus => {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "CANCELED":
      return "Cancelled";
    case "FAILED":
    case "CRASHED":
    case "SYSTEM_FAILURE":
    case "INTERRUPTED":
      return "Failed";
    default:
      // QUEUED, EXECUTING, REATTEMPTING, FROZEN, PENDING_VERSION
      return "Running";
  }
};

const parseTimestamp = (iso?: string | null): number | null => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
};

export const summarizeRun = (run: TriggerApiRun): TriggerRunSummary => {
  const status = mapTriggerStatus(run.status);
  const queuedAt = parseTimestamp(run.createdAt);
  const endedAt = parseTimestamp(run.finishedAt);
  const durationMs =
    typeof run.durationMs === "number" && run.durationMs > 0
      ? run.durationMs
      : endedAt !== null && queuedAt !== null
        ? Math.max(0, endedAt - queuedAt)
        : null;
  return {
    runId: run.id,
    status,
    queuedAt,
    endedAt,
    durationMs,
    ...(run.isTest ? { isTest: true } : {}),
  };
};

const runSortKey = (run: TriggerRunSummary) => run.endedAt ?? run.queuedAt ?? 0;

export const buildTriggerStatusResponse = ({
  runs,
  fetchedAt,
  windowHours = TRIGGER_STATUS_WINDOW_HOURS,
  error,
}: {
  runs: TriggerApiRun[];
  fetchedAt: Date;
  windowHours?: number;
  error?: string;
}): TriggerStatusResponse => {
  const runsByTask = new Map<string, TriggerRunSummary[]>();
  for (const run of runs) {
    if (!run.id || !run.taskIdentifier) continue;
    runsByTask.set(run.taskIdentifier, [
      ...(runsByTask.get(run.taskIdentifier) ?? []),
      summarizeRun(run),
    ]);
  }

  const jobs: TriggerJobStatus[] = [...runsByTask.entries()]
    .map(([id, taskRuns]) => {
      const sorted = [...taskRuns].sort(
        (a, b) => runSortKey(b) - runSortKey(a),
      );
      return {
        id,
        name: jobNameFromId(id),
        lastRun: sorted[0] ?? null,
        counts: {
          running: sorted.filter((run) => run.status === "Running").length,
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
      acc.running += job.counts.running;
      acc.completed += job.counts.completed;
      acc.failed += job.counts.failed;
      acc.cancelled += job.counts.cancelled;
      return acc;
    },
    {
      jobs: jobs.length,
      runs: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
  );

  return {
    fetchedAt: fetchedAt.toISOString(),
    windowHours,
    ...(error ? { error } : {}),
    jobs,
    totals,
  };
};
