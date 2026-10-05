import type { EveServer } from "./constants";
import { serverEndpoints } from "./constants";

/**
 * Absolute CDN URL for a `res:/` file, given its hashed relative path. Resolves
 * against the operating provider's `res` host (CCP vs NetEase). `server` is
 * required: a NetEase-only file does not exist on CCP's host.
 */
export function resourceUrl(relPath: string, server: EveServer): string {
  return serverEndpoints(server).resBaseUrl + relPath;
}

/**
 * Absolute CDN URL for an `app:/` file, given its hashed relative path. Resolves
 * against the operating provider's `app` host. `server` is required, as for
 * {@link resourceUrl}.
 */
export function binariesUrl(relPath: string, server: EveServer): string {
  return serverEndpoints(server).appBaseUrl + relPath;
}
