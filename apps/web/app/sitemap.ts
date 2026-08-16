import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MetadataRoute } from "next";

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
 * Written as a scan rather than a `/\/+$/` replace: that pattern backtracks
 * super-linearly on a run of slashes.
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

const isPageFile = (name: string) =>
  name === "page" || name.startsWith("page.");
const isDynamicSegment = (name: string) => name.includes("[");
const isRouteGroup = (name: string) =>
  name.startsWith("(") && name.endsWith(")");
const isParallelSegment = (name: string) => name.startsWith("@");

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
 *
 * Listing either spends crawl budget without earning impressions, and dilutes
 * the families that do rank.
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
          where: { isDeleted: false },
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
    path: "/dogma/attribute",
    ids: async () =>
      (
        await prisma.dogmaAttribute.findMany({
          where: { isDeleted: false },
          select: { attributeId: true },
          orderBy: { attributeId: "asc" },
        })
      ).map((row) => row.attributeId),
  },
  {
    path: "/dogma/effect",
    ids: async () =>
      (
        await prisma.dogmaEffect.findMany({
          where: { isDeleted: false },
          select: { effectId: true },
          orderBy: { effectId: "asc" },
        })
      ).map((row) => row.effectId),
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

async function collectStaticRoutes(): Promise<string[]> {
  const routes = new Set<string>();

  async function walk(dir: string, segments: string[]) {
    const entries = await readdir(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && isPageFile(entry.name))) {
      const routePath = segments.length === 0 ? "/" : `/${segments.join("/")}`;
      routes.add(routePath);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      if (isDynamicSegment(entry.name)) continue;

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
            urls: ids.map((id) => `${SITE_URL}${source.path}/${id}`),
          };
        } catch (error: unknown) {
          console.error(
            `Failed to collect sitemap ids for ${source.path}.`,
            error,
          );
          return { ok: false, urls: [] as string[] };
        }
      }),
    ),
  ]);

  const urls = [
    ...staticRoutes.filter(isCrawlable).map((route) => `${SITE_URL}${route}`),
    ...families.flatMap((family) => family.urls),
  ];

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
