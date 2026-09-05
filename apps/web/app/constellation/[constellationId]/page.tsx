import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constellationId: string }>;
}): Promise<Metadata> {
  const { constellationId } = await params;
  const id = parsePositiveEntityId(constellationId);
  if (id === null) return {};
  try {
    // Shares `readConstellation` with the page rather than issuing its own
    // one-column query, as the station page shares `readStation`: the metadata
    // pass and the render then resolve to the same cache entry, so the route
    // costs one query per render instead of two. The `catch` stays out here,
    // outside the cached scope, which is what makes that safe.
    const constellation = await readConstellation(id);
    if (!constellation) return {};
    return {
      title: constellation.name,
      description: `${constellation.name} constellation in EVE Online.`,
      alternates: { canonical: `/constellation/${id}` },
    };
  } catch {
    return {};
  }
}

interface ConstellationSummary {
  name: string;
  regionId: number;
  regionName: string | null;
}

/**
 * Read a constellation and its parent region from our database. Returns null
 * for an unknown id — the caller turns that into a 404.
 *
 * Cached for days: these rows only change when a new SDE release is ingested.
 * A failed query throws rather than returning null, so a database blip can
 * never be mistaken for a missing constellation and stored as a day-long 404
 * (see "Never catch a database error inside a `"use cache"` scope" in
 * CLAUDE.md). That is also why this uses `findUnique` plus a null test rather
 * than `findUniqueOrThrow`, which would collapse the two cases into one error.
 */
async function readConstellation(
  constellationId: number,
): Promise<ConstellationSummary | null> {
  "use cache";
  cacheLife("days");

  const constellation = await prisma.constellation.findUnique({
    select: { name: true, regionId: true, region: { select: { name: true } } },
    where: { constellationId },
  });
  if (!constellation) return null;

  return {
    name: constellation.name,
    regionId: constellation.regionId,
    regionName: constellation.region?.name ?? null,
  };
}

/**
 * The id check and the database read live here rather than in `Page` so they
 * happen *inside* the Suspense boundary, alongside `params`.
 */
async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ constellationId: string }>;
}>) {
  const { constellationId } = await params;
  const id = parsePositiveEntityId(constellationId);
  if (id === null) notFound();

  const constellation = await readConstellation(id);
  if (!constellation) notFound();

  return (
    <PageClient
      constellationId={id}
      name={constellation.name}
      regionId={constellation.regionId}
      regionName={constellation.regionName}
    />
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ constellationId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
