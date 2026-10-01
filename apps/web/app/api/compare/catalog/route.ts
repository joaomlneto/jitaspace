import { readCompareCatalog } from "~/lib/compareCatalog";

/**
 * The compare tool's catalog as JSON (see `~/components/Compare/catalog`).
 *
 * `readCompareCatalog` is an argument-free `"use cache"` read of SDE tables,
 * so under `cacheComponents` this handler is prerendered at build and served
 * as a static file; the `sde` tag it carries drops it when a new SDE build is
 * ingested. The page fetches it once per visit rather than receiving it as a
 * prop, which would inline ~700 KB into every page load's HTML.
 */
export async function GET(): Promise<Response> {
  return Response.json(await readCompareCatalog());
}
