import { isServer } from "@tanstack/react-query";

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

export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  // Also React Query's default: queries rendered on the server never retry.
  if (isServer) return false;
  if (failureCount >= MAX_RETRIES) return false;
  const status = statusOf(error);
  return typeof status !== "number" || !NON_RETRYABLE_STATUSES.has(status);
};
