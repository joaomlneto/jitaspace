import type { EvePlatform, EveServer } from "./constants";
import type { ResourceEntry, ResourceIndex } from "./types";
import { getCurrentBuild } from "./build";
import {
  DEFAULT_PLATFORM,
  PLATFORM_LAYOUT,
  serverEndpoints,
} from "./constants";
import { parseResourceIndex } from "./parse";
import { binariesUrl } from "./url";

/**
 * Fetch and parse the "app index" for a build — the list of game binaries plus
 * a handful of meta files, including a pointer to the resfile index.
 *
 * Each platform has its own app index (`eveonline_<build>.txt` for Windows,
 * `eveonlinemacOS_<build>.txt` for macOS); see {@link PLATFORM_LAYOUT}. The
 * `server` selects the operating provider's index host (CCP vs NetEase); it
 * defaults to Tranquility.
 */
export async function fetchAppIndex(
  build: string,
  fetchImpl: typeof fetch = fetch,
  platform: EvePlatform = DEFAULT_PLATFORM,
  server: EveServer = "tranquility",
): Promise<ResourceEntry[]> {
  const url = `${serverEndpoints(server).indexBaseUrl}${PLATFORM_LAYOUT[platform].appIndexPrefix}${build}.txt`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch EVE app index from ${url} (HTTP ${response.status})`,
    );
  }
  return parseResourceIndex(await response.text());
}

/**
 * Fetch and parse the "resfile index" for a build — the ~120k `res:/` asset
 * entries (textures, models, static data, localization, audio, ...).
 *
 * The resfile index is itself an app file, so we first resolve the app index
 * to discover the index's hashed location. When a `platform` is given, the
 * platform-specific shader overlay (`effect.dx11` / `effect.metal`) is merged
 * on top of the base set; without one, only the base set is returned.
 *
 * `server` selects the operating provider's hosts (the app-index host and the
 * `app:/` file host the resfile indexes themselves are fetched from).
 */
export async function fetchResfileIndex(
  build: string,
  fetchImpl: typeof fetch = fetch,
  platform?: EvePlatform,
  server: EveServer = "tranquility",
): Promise<ResourceEntry[]> {
  const layout = PLATFORM_LAYOUT[platform ?? DEFAULT_PLATFORM];
  const appIndex = await fetchAppIndex(
    build,
    fetchImpl,
    platform ?? DEFAULT_PLATFORM,
    server,
  );

  const fetchIndexFile = async (
    appPath: string,
    required: boolean,
  ): Promise<ResourceEntry[]> => {
    const entry = appIndex.find((e) => e.path === appPath);
    if (!entry) {
      if (required) {
        throw new Error(
          `App index for build ${build} does not contain ${appPath}`,
        );
      }
      return [];
    }
    const url = binariesUrl(entry.relPath, server);
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${appPath} from ${url} (HTTP ${response.status})`,
      );
    }
    return parseResourceIndex(await response.text());
  };

  const base = await fetchIndexFile(layout.resfileIndexPath, true);
  if (!platform) return base;

  // The full client resource set is the base plus a platform-only shader
  // overlay; appended so its entries win on any path collision.
  const overlay = await fetchIndexFile(layout.resfileOverlayPath, false);
  return [...base, ...overlay];
}

/**
 * Resolve the full resource index for a server in one call:
 * current build → app index → resfile index.
 */
export async function fetchResourceIndex(
  server: EveServer = "tranquility",
  fetchImpl: typeof fetch = fetch,
): Promise<ResourceIndex> {
  const { build } = await getCurrentBuild(server, fetchImpl);
  const entries = await fetchResfileIndex(build, fetchImpl, undefined, server);
  return { server, build, entries };
}
