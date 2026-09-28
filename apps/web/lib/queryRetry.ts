import { environmentManager } from "@tanstack/react-query";

import { shouldRetryEsiRequest } from "@jitaspace/esi-client";

/**
 * The app's default query retry: the ESI retry policy in the browser (see
 * {@link shouldRetryEsiRequest}) and, as React Query's own default, none on
 * the server.
 */
export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean =>
  !environmentManager.isServer() && shouldRetryEsiRequest(failureCount, error);
