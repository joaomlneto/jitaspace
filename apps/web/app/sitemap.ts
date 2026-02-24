import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MetadataRoute } from "next";

import { prisma } from "@jitaspace/db";

import { CONFIG } from "~/config/constants.ts";

const MAX_URLS_PER_SITEMAP = 50000;
const LAST_MODIFIED = process.env.NEXT_PUBLIC_MODIFIED_DATE
  ? new Date(process.env.NEXT_PUBLIC_MODIFIED_DATE)
  : new Date();

const APP_DIR = join(process.cwd(), "app");

let cachedStaticRoutes: string[] | null = null;

const isPageFile = (name: string) =>
  name === "page" || name.startsWith("page.");
const isDynamicSegment = (name: string) => name.includes("[");
const isRouteGroup = (name: string) =>
  name.startsWith("(") && name.endsWith(")");
const isParallelSegment = (name: string) => name.startsWith("@");

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
  return [...routes].sort();
}

async function getStaticRoutes(): Promise<string[]> {
  if (cachedStaticRoutes) return cachedStaticRoutes;
  try {
    cachedStaticRoutes = await collectStaticRoutes();
  } catch (error: unknown) {
    console.error("Failed to collect static routes for sitemap.", error);
    cachedStaticRoutes = [];
  }
  return cachedStaticRoutes;
}

async function getTypeIdsSafe(): Promise<number[]> {
  try {
    return await prisma.type
      .findMany({
        select: {
          typeId: true,
        },
      })
      .then((entries) => entries.map((entry) => entry.typeId));
  } catch (error: unknown) {
    console.error("Failed to fetch ESI type IDs for sitemap.", error);
    return [];
  }
}

function normalizeId(rawId: string): number {
  const parsed = Number(rawId);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

async function getSitemapIds(): Promise<number[]> {
  const [staticRoutes, typeIds] = await Promise.all([
    getStaticRoutes(),
    getTypeIdsSafe(),
  ]);
  const totalUrls = staticRoutes.length + typeIds.length;
  const totalSitemaps = Math.max(
    1,
    Math.ceil(totalUrls / MAX_URLS_PER_SITEMAP),
  );
  return Array.from({ length: totalSitemaps }, (_, index) => index);
}

export async function getSitemapUrls(): Promise<string[]> {
  const ids = await getSitemapIds();
  return ids.map((id) => `${CONFIG.SITE_URL}/sitemap/${id}.xml`);
}

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const ids = await getSitemapIds();
  return ids.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const pageId = normalizeId(await props.id);
  const [staticRoutes, typeIds] = await Promise.all([
    getStaticRoutes(),
    getTypeIdsSafe(),
  ]);

  const totalEntries = staticRoutes.length + typeIds.length;
  const start = pageId * MAX_URLS_PER_SITEMAP;
  if (start >= totalEntries) return [];

  const end = Math.min(totalEntries, start + MAX_URLS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  if (start < staticRoutes.length) {
    const staticSlice = staticRoutes.slice(
      start,
      Math.min(end, staticRoutes.length),
    );
    for (const route of staticSlice) {
      entries.push({
        url: route,
        lastModified: LAST_MODIFIED,
      });
    }
  }

  if (end > staticRoutes.length) {
    const typeStart = Math.max(0, start - staticRoutes.length);
    const typeEnd = Math.min(typeIds.length, end - staticRoutes.length);
    for (const typeId of typeIds.slice(typeStart, typeEnd)) {
      entries.push({
        url: `${CONFIG.SITE_URL}/type/${typeId}`,
        lastModified: LAST_MODIFIED,
      });
    }
  }

  return entries;
}
