import {
  AbortTaskRunError,
  logger,
  schedules,
  task,
  tasks,
  wait,
} from "@trigger.dev/sdk";

import type {
  JobContext,
  JobDefinition,
  JobDuration,
  JobLogger,
} from "@jitaspace/background-jobs";
import { NonRetriableError } from "@jitaspace/background-jobs";

// Minimal shape we need from a created task to back `ctx.invoke`.
interface TriggerableTask {
  triggerAndWait: (payload: unknown) => Promise<{ unwrap: () => unknown }>;
}

const taskById = new Map<string, TriggerableTask>();

// Trigger's `wait.for` takes { seconds | minutes | hours | days }; our
// JobDuration is a number of seconds or a string like "60s"/"3m"/"1h".
const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const toWaitDuration = (duration: JobDuration): { seconds: number } => {
  if (typeof duration === "number") return { seconds: duration };
  const match = /^(\d+)\s*([smhd])?$/.exec(duration.trim());
  if (!match) return { seconds: 60 };
  const value = Number(match[1]);
  const factor = DURATION_UNIT_SECONDS[match[2] ?? "s"] ?? 1;
  return { seconds: value * factor };
};

const toMessage = (message: string | Record<string, unknown>): string =>
  typeof message === "string" ? message : JSON.stringify(message);

const triggerLogger: JobLogger = {
  debug: (message, meta) => logger.debug(toMessage(message), meta),
  info: (message, meta) => logger.info(toMessage(message), meta),
  warn: (message, meta) => logger.warn(toMessage(message), meta),
  error: (message, meta) => logger.error(toMessage(message), meta),
};

const buildContext = (payload: unknown, attempt: number): JobContext => ({
  payload,
  attempt,
  logger: triggerLogger,
  // No inline step memoization on Trigger.dev: just run the function. The whole
  // task body re-runs on retry (see JobContext.run docs). All jobs are idempotent.
  run: <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
  sleep: async (_name: string, duration: JobDuration): Promise<void> => {
    await wait.for(toWaitDuration(duration));
  },
  send: async (jobId: string, payload: unknown): Promise<void> => {
    await tasks.trigger(jobId, payload ?? {});
  },
  invoke: async <R>(jobId: string, payload: unknown): Promise<R> => {
    const target = taskById.get(jobId);
    if (!target) {
      throw new Error(`Cannot invoke unknown job id: ${jobId}`);
    }
    const result = await target.triggerAndWait(payload ?? {});
    return result.unwrap() as R;
  },
});

const taskOptions = (job: JobDefinition) => {
  const concurrencyLimit = job.singleton ? 1 : job.concurrencyLimit;
  return {
    ...(concurrencyLimit ? { queue: { concurrencyLimit } } : {}),
    // JobDefinition `retries: N` = N retries after the first attempt (N+1
    // total); Trigger `maxAttempts` is the total, so add one.
    ...(job.retries === undefined
      ? {}
      : { retry: { maxAttempts: job.retries + 1 } }),
    ...(job.maxDurationSeconds ? { maxDuration: job.maxDurationSeconds } : {}),
    ...(job.machine ? { machine: job.machine } : {}),
  };
};

// Job cron strings may be prefixed `TZ=Area/City`; Trigger wants the
// pattern plus a separate timezone.
const toTriggerCron = (
  cron: string,
): string | { pattern: string; timezone: string } => {
  const trimmed = cron.trim();
  // Parse an optional `TZ=Area/City ` prefix without a regex (avoids ReDoS).
  if (trimmed.startsWith("TZ=")) {
    const spaceIndex = trimmed.indexOf(" ");
    if (spaceIndex > 3) {
      const timezone = trimmed.slice(3, spaceIndex);
      const pattern = trimmed.slice(spaceIndex + 1).trim();
      if (timezone && pattern) return { pattern, timezone };
    }
  }
  return trimmed;
};

const runJob = async (
  job: JobDefinition,
  payload: unknown,
  attempt: number,
): Promise<unknown> => {
  try {
    return await job.handler(buildContext(payload, attempt));
  } catch (error) {
    // Translate the platform-agnostic NonRetriableError to Trigger's abort.
    if (error instanceof NonRetriableError) {
      throw new AbortTaskRunError(error.message);
    }
    throw error;
  }
};

/**
 * Wrap a platform-agnostic job as a Trigger.dev task (or scheduled task for
 * cron jobs). Calling this registers the task with Trigger; v4 indexes tasks by
 * registration rather than export; `src/trigger/index.ts` iterates the registry.
 */
export function toTriggerTask(job: JobDefinition) {
  const created =
    job.trigger.type === "cron"
      ? schedules.task({
          id: job.id,
          cron: toTriggerCron(job.trigger.cron),
          ...taskOptions(job),
          run: async (payload, { ctx }) =>
            runJob(job, payload, ctx.attempt.number),
        })
      : task({
          id: job.id,
          ...taskOptions(job),
          run: async (payload: unknown, { ctx }) =>
            runJob(job, payload, ctx.attempt.number),
        });

  taskById.set(job.id, created as unknown as TriggerableTask);
  return created;
}
