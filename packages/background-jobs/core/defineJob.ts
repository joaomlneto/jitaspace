import type { JobContext } from "./context";

export type JobTrigger = { type: "event" } | { type: "cron"; cron: string };

export interface JobDefinition<Payload = unknown, Result = unknown> {
  /**
   * Stable identifier. Doubles as the Inngest function id + trigger event name
   * and the Trigger.dev task id. Used by `ctx.send`/`ctx.invoke` to reference
   * this job. Changing it changes the dashboard slug, so keep it stable.
   */
  id: string;
  name: string;
  description?: string;
  trigger: JobTrigger;
  /** Max concurrent runs. Inngest concurrency.limit / Trigger queue.concurrencyLimit. */
  concurrencyLimit?: number;
  /**
   * One run at a time. Inngest → singleton{mode:"skip"} (drops overlap). Trigger
   * has no skip, so the adapter approximates with concurrencyLimit:1 (overlapping
   * runs QUEUE instead of being dropped).
   */
  singleton?: boolean;
  /** Retries after the first attempt. Inngest passes through; Trigger uses maxAttempts = retries + 1. */
  retries?: number;
  /** Per-job execution cap in seconds. Maps to Trigger maxDuration; advisory on Inngest. */
  maxDurationSeconds?: number;
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
