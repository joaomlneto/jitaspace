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
 * Throws if the request fails or the document has no numeric `build`.
 *
 * Network-bound; intended for server/CLI use (the CDN sends no CORS headers).
 */
export async function getCurrentBuild(
  server: EveServer,
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
  const info = (await response.json()) as Partial<BuildInfo> | null;
  if (typeof info?.build !== "string" || !/^\d+$/.test(info.build)) {
    throw new Error(`EVE build pointer at ${url} has no valid build number`);
  }
  return info as BuildInfo;
}
