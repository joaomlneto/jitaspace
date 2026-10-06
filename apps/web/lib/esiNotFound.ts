import { isAxiosError } from "axios";

/**
 * Whether an ESI call failed because the entity does not exist (HTTP 404), as
 * opposed to ESI being down or rate-limiting. A 404 is a fact worth caching;
 * any other failure is not.
 */
export const isEsiNotFound = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 404;
