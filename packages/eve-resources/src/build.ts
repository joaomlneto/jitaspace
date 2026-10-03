import type { EveServer } from "./constants";
import { EVE_CLIENT_POINTER, serverEndpoints } from "./constants";

/** The `eveclient_<server>.json` build-pointer document. */
export interface BuildInfo {
  /** Current build number, e.g. `"3368760"`. */
  build: string;
  buildNumber?: string;
  protected?: boolean;
  platforms?: string[];
}

/**
 * Fetch the current published build number for an EVE server cluster.
 *
 * This is the entry point of the resource-resolution chain:
 * build → app index → resfile index → individual resource files.
 *
 * Network-bound; intended for server/CLI use (the CDN sends no CORS headers).
 */
export async function getCurrentBuild(
  server: EveServer = "tranquility",
  fetchImpl: typeof fetch = fetch,
): Promise<BuildInfo> {
  const url =
    serverEndpoints(server).metadataBaseUrl + EVE_CLIENT_POINTER[server];
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch EVE build info from ${url} (HTTP ${response.status})`,
    );
  }
  return (await response.json()) as BuildInfo;
}
