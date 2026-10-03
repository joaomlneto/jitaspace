import type { EveServer } from "./constants";
import { serverEndpoints } from "./constants";

/**
 * Absolute CDN URL for a `res:/` file, given its hashed relative path. Resolves
 * against the operating provider's `res` host (CCP vs NetEase); defaults to
 * Tranquility so existing CCP-only callers are unaffected.
 */
export function resourceUrl(
  relPath: string,
  server: EveServer = "tranquility",
): string {
  return serverEndpoints(server).resBaseUrl + relPath;
}

/**
 * Absolute CDN URL for an `app:/` file, given its hashed relative path. Resolves
 * against the operating provider's `app` host; defaults to Tranquility.
 */
export function binariesUrl(
  relPath: string,
  server: EveServer = "tranquility",
): string {
  return serverEndpoints(server).appBaseUrl + relPath;
}
