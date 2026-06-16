import type { GetFunctionInput } from "inngest";
import {
  eventType,
  NonRetriableError as InngestNonRetriableError,
  staticSchema,
} from "inngest";

import type {
  JobContext,
  JobDefinition,
  JobDuration,
} from "@jitaspace/background-jobs";
import { NonRetriableError, registry } from "@jitaspace/background-jobs";

import { client } from "./client";

type InngestFunctionRef = ReturnType<typeof client.createFunction>;

// The fully-typed handler context for our client, including the built-in
// middleware extensions (`logger`) and step tooling. Inngest types the bare
// `createFunction` handler arg as `any`, so name it explicitly.
type InngestHandlerCtx = GetFunctionInput<typeof client>;

// Inngest types `retries` as a 0–20 literal union; our jobs only use 0/3/5.
// prettier-ignore
type InngestRetries =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

// A job id IS its Inngest event name — orchestration is internal-only, so we
// collapse the old `scrape/esi/x` event names into the function ids.
const fnById = new Map<string, InngestFunctionRef>();

// Inngest's step.sleep takes a duration string ("60s") or a Date/ms number; our
// JobDuration number means *seconds*, so normalise it to a string.
const toInngestDuration = (duration: JobDuration): string =>
  typeof duration === "number" ? `${duration}s` : duration;

const toInngestFunction = (job: JobDefinition): InngestFunctionRef =>
  client.createFunction(
    {
      id: job.id,
      name: job.name,
      ...(job.description ? { description: job.description } : {}),
      triggers:
        job.trigger.type === "cron"
          ? [{ cron: job.trigger.cron }]
          : [
              eventType(job.id, {
                schema: staticSchema<Record<string, unknown>>(),
              }),
            ],
      ...(job.singleton
        ? { singleton: { key: job.id, mode: "skip" as const } }
        : {}),
      ...(job.concurrencyLimit
        ? { concurrency: { limit: job.concurrencyLimit } }
        : {}),
      ...(job.retries === undefined
        ? {}
        : { retries: job.retries as InngestRetries }),
    },
    async (inngestCtx: InngestHandlerCtx) => {
      const { event, step, logger, attempt } = inngestCtx;
      // `event.data` is `EventPayload["data"]` (typed `any` upstream); the job
      // contract treats the payload as opaque `unknown`.
      const payload: unknown = event.data;

      const ctx: JobContext = {
        payload,
        attempt: attempt + 1,
        logger: {
          debug: (message, meta) => logger.debug(message, meta),
          info: (message, meta) => logger.info(message, meta),
          warn: (message, meta) => logger.warn(message, meta),
          error: (message, meta) => logger.error(message, meta),
        },
        run: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
          // Inngest deep-clones step results to JSON (`Jsonify<T>`); the
          // platform-agnostic contract treats the result as the original `T`.
          // All step payloads here are already JSON-safe, so the runtime value
          // matches — bridge the two at this adapter boundary.
          const result = await step.run(name, fn);
          return result as Awaited<T>;
        },
        sleep: (name, duration) =>
          step.sleep(name, toInngestDuration(duration)),
        send: async (jobId, payload) => {
          await step.sendEvent(`send:${jobId}`, {
            name: jobId,
            data: (payload ?? {}) as Record<string, unknown>,
          });
        },
        invoke: async <R>(jobId: string, payload: unknown): Promise<R> => {
          const target = fnById.get(jobId);
          if (!target) {
            throw new Error(`Cannot invoke unknown job id: ${jobId}`);
          }
          // `step.invoke` resolves to the target's (JSON-serialized) output as
          // `unknown`; the caller declares the expected shape via `R`.
          const result = await step.invoke(`invoke:${jobId}`, {
            function: target,
            data: payload ?? {},
          });
          return result as R;
        },
      };

      try {
        return await job.handler(ctx);
      } catch (error) {
        // Translate the platform-agnostic NonRetriableError to Inngest's.
        if (error instanceof NonRetriableError) {
          throw new InngestNonRetriableError(error.message);
        }
        throw error;
      }
    },
  );

/**
 * Every platform-agnostic job, mapped to an Inngest function and registered
 * with the shared client. The `fnById` map (populated here) backs `ctx.invoke`.
 */
export const functions: InngestFunctionRef[] = registry.jobs.map((job) => {
  const fn = toInngestFunction(job);
  fnById.set(job.id, fn);
  return fn;
});
