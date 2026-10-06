import { isAxiosError } from "axios";

/**
 * Whether an ESI call failed because the entity does not exist: HTTP 404, or
 * 422 for an id that cannot name one (`/characters/2/`). That is a fact worth
 * caching, unlike ESI being down or rate-limiting.
 */
export const isEsiNotFound = (error: unknown) =>
  isAxiosError(error) &&
  (error.response?.status === 404 || error.response?.status === 422);
