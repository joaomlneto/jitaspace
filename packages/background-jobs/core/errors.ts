/**
 * Thrown by a job handler to signal a permanent failure that must NOT be
 * retried (e.g. invalid input / impossible state). Each platform adapter
 * translates this to its own non-retriable signal (the Trigger.dev adapter
 * maps it to `AbortTaskRunError` from `@trigger.dev/sdk`).
 */
export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetriableError";
  }
}
