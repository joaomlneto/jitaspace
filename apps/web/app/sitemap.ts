import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MetadataRoute } from "next";
import type { Dirent } from "node:fs";

import { CONFIG } from "~/config/constants.ts";
import { isCrawlable } from "~/config/seo.ts";
import { env } from "~/env";
import { prisma } from "~/lib/db";

const MAX_URLS_PER_SITEMAP = 50000;
const LAST_MODIFIED = env.NEXT_PUBLIC_MODIFIED_DATE
  ? new Date(env.NEXT_PUBLIC_MODIFIED_DATE)
  : new Date();

/**
 * `url` without its trailing slashes.
 *
 * Written as a scan rather than a `/\/+$/` replace only because that pattern is
 * super-linear in general — on a run of slashes *away* from the end (`"///a"`)
 * it retries at every position. A trailing run, which is all this function is
 * ever handed, is the cheap case. The scan sidesteps the rule entirely.
 */
function stripTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end -= 1;
  return url.slice(0, end);
}

// The sitemap protocol requires every <loc> to be a fully-qualified URL —
// relative paths are silently discarded by crawlers. Trailing slashes on the
// configured origin would double up against the leading slash of each route.
const SITE_URL = stripTrailingSlashes(CONFIG.SITE_URL);

const APP_DIR = join(process.cwd(), "app");

/**
 * How long an assembled URL list is reused before the next crawler hit rebuilds
 * it. The list costs one query per entity family, so without this every request
 * for every sitemap page re-runs all of them.
 */
const URL_CACHE_TTL_MS = 60 * 60 * 1000;

// An allow-list, not a `page.` prefix test: `page.client.tsx` and
// `page.module.css` are not routes, and treating them as one would invent
// routes for any directory that holds only a client component.
const PAGE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "page.mdx",
]);
const isPageFile = (name: string) => PAGE_FILES.has(name);
const isDynamicSegment = (name: string) => name.includes("[");
const isRouteGroup = (name: string) =>
  name.startsWith("(") && name.endsWith(")");
const isParallelSegment = (name: string) => name.startsWith("@");
/** `[[...waypoints]]` — matches zero segments, so it also serves its parent. */
const isOptionalCatchAll = (name: string) =>
  name.startsWith("[[...") && name.endsWith("]]");

/** A family of database-backed URLs, e.g. every `/system/{solarSystemId}`. */
interface EntitySource {
  /** Route prefix the ids hang off — `/system` yields `/system/30000142`. */
  path: string;
  /** Resolves the ids to emit. A rejection degrades to an empty family. */
  ids: () => Promise<number[]>;
}

/**
 * The database-backed URL families worth advertising.
 *
 * An entity family earns a place here by being bounded in number, stable, and
 * carrying enough of its own content to stand up as a search result. That rules
 * out two large groups on purpose:
 *
 * - **Player entities** — characters, corporations, alliances, killmails,
 *   contracts, wars. Unbounded, constantly churning, and mostly rows we only
 *   hold because someone logged in or a killmail referenced them.
 * - **Map minutiae** — planets, moons and stars, ~90k rows between them whose
 *   pages are a name and a handful of numbers.
 * - **Dogma attributes and effects** — ~8k pages that each render every type
 *   carrying the attribute. `/dogma/attribute/4` (mass) is 29.8 MB and takes
 *   over a minute; the response exceeds the 2 MB `"use cache"` entry limit, so
 *   its `cacheLife("days")` silently never stores and every hit is a full-table
 *   join. Several also blow past Google's 15 MB fetch cap. Nothing links to
 *   them today — `/dogma/attributes` renders its list on the client — so the
 *   sitemap would be the crawler's way in. Restore these once the pages cap
 *   their type list.
 *
 * Listing any of them spends crawl budget without earning impressions, and
 * dilutes the families that do rank.
 *
 * Order must be totally deterministic, because pagination slices this list and
 * `/sitemap/0.xml` and `/sitemap/1.xml` are separate requests that each rebuild
 * it — potentially on different instances, from different cache snapshots. Two
 * things guarantee that: this array's order, and the `orderBy` on every query.
 * Without the latter the database is free to return rows in any order, so the
 * two pages could overlap on some URLs and omit others entirely. Do not drop
 * either.
 */
const ENTITY_SOURCES: EntitySource[] = [
  {
    path: "/type",
    ids: async () =>
      (
        await prisma.type.findMany({
          // typeId 0 exists in the table but `/type/0` renders the not-found UI:
          // the page coerces the segment with `Number()` and treats the falsy 0
          // as missing. Because that `notFound()` throws inside a <Suspense>
          // boundary the response is still HTTP 200, so advertising it would
          // hand crawlers a soft 404 — the very thing `isDeleted` filters out.
          where: { isDeleted: false, typeId: { gt: 0 } },
          select: { typeId: true },
          orderBy: { typeId: "asc" },
        })
      ).map((row) => row.typeId),
  },
  {
    path: "/category",
    ids: async () =>
      (
        await prisma.category.findMany({
          where: { isDeleted: false },
          select: { categoryId: true },
          orderBy: { categoryId: "asc" },
        })
      ).map((row) => row.categoryId),
  },
  {
    path: "/group",
    ids: async () =>
      (
        await prisma.group.findMany({
          where: { isDeleted: false },
          select: { groupId: true },
          orderBy: { groupId: "asc" },
        })
      ).map((row) => row.groupId),
  },
  {
    path: "/region",
    ids: async () =>
      (
        await prisma.region.findMany({
          where: { isDeleted: false },
          select: { regionId: true },
          orderBy: { regionId: "asc" },
        })
      ).map((row) => row.regionId),
  },
  {
    path: "/constellation",
    ids: async () =>
      (
        await prisma.constellation.findMany({
          where: { isDeleted: false },
          select: { constellationId: true },
          orderBy: { constellationId: "asc" },
        })
      ).map((row) => row.constellationId),
  },
  {
    path: "/system",
    ids: async () =>
      (
        await prisma.solarSystem.findMany({
          where: { isDeleted: false },
          select: { solarSystemId: true },
          orderBy: { solarSystemId: "asc" },
        })
      ).map((row) => row.solarSystemId),
  },
  {
    path: "/station",
    ids: async () =>
      (
        await prisma.station.findMany({
          where: { isDeleted: false },
          select: { stationId: true },
          orderBy: { stationId: "asc" },
        })
      ).map((row) => row.stationId),
  },
  {
    path: "/faction",
    ids: async () =>
      (
        await prisma.faction.findMany({
          where: { isDeleted: false },
          select: { factionId: true },
          orderBy: { factionId: "asc" },
        })
      ).map((row) => row.factionId),
  },
  {
    path: "/race",
    ids: async () =>
      (
        await prisma.race.findMany({
          where: { isDeleted: false },
          select: { raceId: true },
          orderBy: { raceId: "asc" },
        })
      ).map((row) => row.raceId),
  },
  {
    path: "/bloodline",
    ids: async () =>
      (
        await prisma.bloodline.findMany({
          where: { isDeleted: false },
          select: { bloodlineId: true },
          orderBy: { bloodlineId: "asc" },
        })
      ).map((row) => row.bloodlineId),
  },
  {
    // One page per NPC corporation that actually sells something, rather than
    // per corporation — a corp with no offers renders an empty store.
    path: "/lp-store",
    ids: async () =>
      (
        await prisma.loyaltyStoreOffer.groupBy({
          by: ["corporationId"],
          where: { isDeleted: false },
          orderBy: { corporationId: "asc" },
        })
      ).map((row) => row.corporationId),
  },
];

let cachedStaticRoutes: string[] | null = null;
let cachedUrls: { urls: string[]; expiresAt: number } | null = null;

const hasPageFile = (entries: Dirent[]) =>
  entries.some((entry) => entry.isFile() && isPageFile(entry.name));

/** Directories the walk descends into: real path segments only. */
const isTraversable = (entry: Dirent) =>
  entry.isDirectory() &&
  !entry.name.startsWith(".") &&
  entry.name !== "node_modules" &&
  !isDynamicSegment(entry.name);

/**
 * Whether `dir` holds an optional catch-all with a page file.
 *
 * Such a segment matches zero segments, so it also answers its parent path:
 * `app/travel/[[...waypoints]]/page.tsx` serves `/travel`, and nothing else in
 * the tree registers that route. Every other dynamic segment needs an id, which
 * comes from ENTITY_SOURCES instead.
 */
async function servesParentPath(
  dir: string,
  entries: Dirent[],
): Promise<boolean> {
  for (const entry of entries) {
    if (!entry.isDirectory() || !isOptionalCatchAll(entry.name)) continue;
    const nested = await readdir(join(dir, entry.name), {
      withFileTypes: true,
    });
    if (hasPageFile(nested)) return true;
  }
  return false;
}

async function collectStaticRoutes(): Promise<string[]> {
  const routes = new Set<string>();

  async function walk(dir: string, segments: string[]) {
    const entries = await readdir(dir, { withFileTypes: true });
    const routePath = segments.length === 0 ? "/" : `/${segments.join("/")}`;

    if (hasPageFile(entries) || (await servesParentPath(dir, entries))) {
      routes.add(routePath);
    }

    for (const entry of entries.filter(isTraversable)) {
      const nextSegments =
        isRouteGroup(entry.name) || isParallelSegment(entry.name)
          ? segments
          : [...segments, entry.name];

      await walk(join(dir, entry.name), nextSegments);
    }
  }

  await walk(APP_DIR, []);
  return [...routes].sort((a, b) => a.localeCompare(b));
}

async function getStaticRoutes(): Promise<string[]> {
  if (cachedStaticRoutes) return cachedStaticRoutes;
  try {
    cachedStaticRoutes = await collectStaticRoutes();
    return cachedStaticRoutes;
  } catch (error: unknown) {
    // Deliberately not memoized: caching the empty fallback would drop the
    // homepage from this instance's sitemap for the rest of its life over one
    // transient read.
    console.error("Failed to collect static routes for sitemap.", error);
    return [];
  }
}

/**
 * Every URL the sitemap advertises, absolute and in a stable order.
 *
 * A family whose query fails contributes nothing rather than taking the whole
 * sitemap down with it — a database blip should cost us one section, not the
 * crawler's entire view of the site. That degraded list is deliberately *not*
 * cached: serving a truncated sitemap for the next hour because of one refused
 * connection tells crawlers those URLs are gone.
 */
async function getAllUrls(): Promise<string[]> {
  if (cachedUrls && cachedUrls.expiresAt > Date.now()) return cachedUrls.urls;

  const [staticRoutes, families] = await Promise.all([
    getStaticRoutes(),
    Promise.all(
      ENTITY_SOURCES.map(async (source) => {
        try {
          const ids = await source.ids();
          return {
            ok: true,
            paths: ids.map((id) => `${source.path}/${id}`),
          };
        } catch (error: unknown) {
          console.error(
            `Failed to collect sitemap ids for ${source.path}.`,
            error,
          );
          return { ok: false, paths: [] as string[] };
        }
      }),
    ),
  ]);

  // `isCrawlable` gates entity families as well as static routes. No family
  // sits under a disallowed prefix today, but the whole point of the shared
  // list is that a sitemap URL can never contradict robots.txt — enforcing that
  // in one place beats relying on nobody ever adding one that does.
  const urls = [...staticRoutes, ...families.flatMap((family) => family.paths)]
    .filter(isCrawlable)
    .map((path) => `${SITE_URL}${path}`);

  // An empty static-route list means the `app/` walk failed — the real tree
  // always yields at least `/` — so it counts as degraded alongside a failed
  // family query.
  const healthy =
    staticRoutes.length > 0 && families.every((family) => family.ok);
  if (healthy) {
    cachedUrls = { urls, expiresAt: Date.now() + URL_CACHE_TTL_MS };
  }
  return urls;
}

function normalizeId(rawId: string): number {
  const parsed = Number(rawId);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/** Number of `/sitemap/{n}.xml` pages needed, never fewer than one. */
async function getSitemapCount(): Promise<number> {
  const urls = await getAllUrls();
  return Math.max(1, Math.ceil(urls.length / MAX_URLS_PER_SITEMAP));
}

export async function getSitemapUrls(): Promise<string[]> {
  const count = await getSitemapCount();
  return Array.from(
    { length: count },
    (_, index) => `${SITE_URL}/sitemap/${index}.xml`,
  );
}

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const count = await getSitemapCount();
  return Array.from({ length: count }, (_, index) => ({ id: index }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const pageId = normalizeId(await props.id);
  const urls = await getAllUrls();

  const start = pageId * MAX_URLS_PER_SITEMAP;
  if (start >= urls.length) return [];

  return urls
    .slice(start, start + MAX_URLS_PER_SITEMAP)
    .map((url) => ({ url, lastModified: LAST_MODIFIED }));
}
