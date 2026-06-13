/**
 * The platform-agnostic execution context handed to every job handler. Each
 * adapter (Inngest, Trigger.dev) implements these primitives over its own
 * durable-execution API. Handlers are written against this interface and never
 * import a platform SDK.
 */

// Accept either a message string (console-style) or a structured object
// (pino/Inngest-style) as the first argument, so existing handler logging keeps
// working under both adapters.
type JobLogMethod = (
  message: string | Record<string, unknown>,
  meta?: Record<string, unknown>,
) => void;

export interface JobLogger {
  debug: JobLogMethod;
  info: JobLogMethod;
  warn: JobLogMethod;
  error: JobLogMethod;
}

/**
 * A duration: a number of seconds, or an Inngest/Trigger-style string such as
 * "60s", "3m", "1h", "2d". Adapters parse the string form.
 */
export type JobDuration = number | string;

export interface JobContext<Payload = unknown> {
  /** The job's input payload (was Inngest `event.data`). */
  readonly payload: Payload;
  readonly logger: JobLogger;
  /** Current attempt, 1-based. */
  readonly attempt: number;

  /**
   * Run a named unit of work.
   *
   * - Inngest: maps to `step.run` — memoized across the request, so on a retry
   *   already-completed steps are skipped.
   * - Trigger.dev: executes `fn` directly. There is no per-step memoization; if
   *   the task retries, the whole handler body re-runs. Treat `name` as a label
   *   for tracing, NOT as a partial-progress resume boundary. All jobs here are
   *   idempotent (diff-based upserts), so re-running steps is wasteful but safe.
   */
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;

  /** Fire-and-forget another job by id. Inngest → step.sendEvent; Trigger → tasks.trigger. */
  send<P = unknown>(jobId: string, payload: P): Promise<void>;

  /** Invoke another job by id and await its result. Inngest → step.invoke; Trigger → triggerAndWait().unwrap(). */
  invoke<R = unknown, P = unknown>(jobId: string, payload: P): Promise<R>;

  /** Durable sleep. Inngest → step.sleep; Trigger → wait.for (excluded from maxDuration). */
  sleep(name: string, duration: JobDuration): Promise<void>;
}
