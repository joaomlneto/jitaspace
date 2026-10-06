import { cacheLife } from "next/cache";

import {
  isShipTreeDataFileName,
  readShipTreeDataFile,
  SHIP_TREE_DATA_FILE_NAMES,
} from "@jitaspace/ship-tree/server";

const ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * The ship tree's data tables (`/api/ship-tree-data/types.jsonl` and friends),
 * served out of the installed `@eve-online-tools/eve-ship-tree` package.
 *
 * The library fetches these in the browser rather than bundling them. Next
 * prerenders one static response per table at build, read from `node_modules`,
 * and the CDN serves those, so nothing is committed to the repository or copied
 * into `public/`, and nothing reads the filesystem at request time.
 *
 * The read has to sit inside `"use cache"`. Under `cacheComponents`, I/O that
 * runs outside a cache scope makes the handler dynamic, and Next then skips the
 * prerender: the build summary shows `ƒ` instead of `○`, and in production the
 * route would read `node_modules` per request from a function whose file trace
 * cannot see the path. Check the summary after touching this.
 */
export function generateStaticParams() {
  return SHIP_TREE_DATA_FILE_NAMES.map((file) => ({ file }));
}

async function readTable(file: string): Promise<string | null> {
  "use cache";
  // The tables change only when the library is upgraded, which is a new deploy,
  // so a deployment's copy should never be regenerated. That matters: the
  // regeneration would run inside the deployed function, whose file trace does
  // not include `node_modules` (`findPackageJSON` is invisible to the tracer),
  // so it would fail. `"max"` revalidates after 30 days, which a quiet
  // deployment can reach; a year outlives any deployment. `expire` has to
  // exceed `revalidate`, so it matches the longest the SDE reads already use.
  // `outputFileTracingIncludes` is not an alternative: it had no effect on the
  // trace in this Turbopack build.
  cacheLife({ stale: 300, revalidate: ONE_YEAR, expire: ONE_YEAR });
  return readShipTreeDataFile(file);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  // Checked before the cache, so a made-up name never becomes a cache key: only
  // the fourteen real ones can.
  if (!isShipTreeDataFileName(file)) {
    return new Response("Not found", { status: 404 });
  }
  const content = await readTable(file);
  if (content === null) return new Response("Not found", { status: 404 });
  return new Response(content, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
