import { cacheLife } from "next/cache";

import {
  isShipTreeDataFileName,
  readShipTreeDataFile,
  SHIP_TREE_DATA_FILE_NAMES,
} from "@jitaspace/ship-tree/server";

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
  // The tables change only when the library is upgraded, which is a new deploy.
  cacheLife("max");
  return readShipTreeDataFile(file);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  // Checked before the cache, so a made-up name never becomes a cache key: only
  // the thirteen real ones can.
  if (!isShipTreeDataFileName(file)) {
    return new Response("Not found", { status: 404 });
  }
  const content = await readTable(file);
  if (content === null) return new Response("Not found", { status: 404 });
  return new Response(content, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
