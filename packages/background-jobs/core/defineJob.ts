import type { JobContext } from "./context";

export type JobTrigger = { type: "event" } | { type: "cron"; cron: string };

/**
 * Resource preset for a run, matching Trigger.dev's machine presets. Honoured
 * by the Trigger.dev adapter; use it for memory/CPU-heavy jobs like the
 * in-process `ingest-sde-all` pipeline.
 */
export type JobMachine =
  | "micro"
  | "small-1x"
  | "small-2x"
  | "medium-1x"
  | "medium-2x"
  | "large-1x"
  | "large-2x";

export interface JobDefinition<Payload = unknown, Result = unknown> {
  /**
   * Stable identifier. Doubles as the Trigger.dev task id and the trigger event
   * name used by `ctx.send`/`ctx.invoke` to reference this job. Changing it
   * changes the dashboard slug, so keep it stable.
   */
  id: string;
  name: string;
  description?: string;
  trigger: JobTrigger;
  /** Max concurrent runs. Maps to Trigger queue.concurrencyLimit. */
  concurrencyLimit?: number;
  /**
   * One run at a time. Trigger has no native skip, so the adapter approximates
   * with concurrencyLimit:1 (overlapping runs QUEUE instead of being dropped).
   */
  singleton?: boolean;
  /** Retries after the first attempt. Trigger uses maxAttempts = retries + 1. */
  retries?: number;
  /** Per-job execution cap in seconds. Maps to Trigger maxDuration. */
  maxDurationSeconds?: number;
  /** Resource preset (Trigger.dev only). For memory/CPU-heavy jobs. */
  machine?: JobMachine;
  // Method syntax (not an arrow property) so `handler`'s parameter is checked
  // bivariantly — this lets a `JobDefinition<SpecificPayload>` live in a
  // `JobDefinition[]` (= `JobDefinition<unknown>[]`) registry without `any`.
  handler(ctx: JobContext<Payload>): Promise<Result>;
}

/** Identity helper that pins the `Payload`/`Result` generics for handler inference. */
export function defineJob<Payload = unknown, Result = unknown>(
  definition: JobDefinition<Payload, Result>,
): JobDefinition<Payload, Result> {
  return definition;
}
