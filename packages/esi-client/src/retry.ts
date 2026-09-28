/**
 * Statuses no retry can fix. React Query retries a failed query three times by
 * default, and every ESI error response counts against ESI's error limit and
 * costs 5 rate-limit tokens, so each of these cost four errors instead of one:
 *
 * - 404: the entity does not exist; asking again gets the same answer.
 * - 420: ESI's error limit is already exhausted; every retry is another error
 *   against it and only pushes back the reset.
 *
 * Other 4xx stay retryable on purpose. A query sent with an access token that
 * expired before the refresh landed fails, and its retry — which re-reads the
 * query's current options, so it carries the refreshed token — is what
 * recovers it.
 */
const NON_RETRYABLE_STATUSES = new Set([404, 420]);

/** React Query's own client-side default. */
const MAX_RETRIES = 3;

const statusOf = (error: unknown): unknown =>
  (error as { response?: { status?: unknown } } | null)?.response?.status;

/**
 * Whether a failed ESI request is worth another attempt, in the shape of
 * React Query's `retry` option. The app's QueryClient uses it as the default;
 * a query that needs its own `retry` should build on it rather than restate
 * React Query's count, or it silently opts out of the statuses above.
 */
export const shouldRetryEsiRequest = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= MAX_RETRIES) return false;
  const status = statusOf(error);
  return typeof status !== "number" || !NON_RETRYABLE_STATUSES.has(status);
};
