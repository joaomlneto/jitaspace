import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

/**
 * The station's own row, or null when there is no such station.
 *
 * Cached for days: these columns change only when an SDE release or the ESI
 * station scraper lands. Nothing is caught inside this scope — a failed query
 * must throw out of it, because the `notFound()` the caller would otherwise
 * render is a *successful* response that Next stores for the full cacheLife
 * (CLAUDE.md). `findUnique` plus a null test is what keeps a genuinely absent
 * station — a real, legitimately cached 404 — distinguishable from an outage.
 *
 * `generateMetadata` and the page share this one read, as the type page shares
 * `getTypeData`: the metadata pass and the render then resolve to the same
 * cache entry, so 5,211 station routes keep costing one query per render
 * rather than two.
 */
async function readStation(stationId: number) {
  "use cache";
  cacheLife("days");

  return prisma.station.findUnique({
    select: {
      name: true,
      solarSystemId: true,
      typeId: true,
      raceId: true,
      ownerId: true,
      // Names, not just ids: the OpenGraph card labels the station with its
      // system, region and owner, and riding along in this row keeps the
      // route at one query rather than adding a second for the card.
      owner: { select: { name: true } },
      solarSystem: {
        select: {
          name: true,
          constellation: { select: { region: { select: { name: true } } } },
        },
      },
    },
    where: { stationId },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stationId: string }>;
}): Promise<Metadata> {
  const { stationId } = await params;
  const id = parsePositiveEntityId(stationId);
  if (id === null) return {};
  try {
    const station = await readStation(id);
    if (!station) return {};

    const system = station.solarSystem?.name;
    const region = station.solarSystem?.constellation.region?.name;
    const owner = station.owner?.name;

    return pageMetadata({
      title: station.name,
      description: `${station.name} is an NPC station${
        system ? ` in ${system}` : ""
      }${owner ? `, operated by ${owner}` : ""}. Browse its services, market orders, and agents.`,
      path: `/station/${id}`,
      badge: "Station",
      image: await resolveTypeImage(station.typeId),
      facts: [
        ...(system ? [{ label: "System", value: system }] : []),
        ...(region ? [{ label: "Region", value: region }] : []),
        ...(owner ? [{ label: "Owner", value: owner }] : []),
      ],
    });
  } catch {
    return {};
  }
}

/**
 * `await params` and the read both happen here, inside the Suspense boundary.
 *
 * Until now the read fed only `generateMetadata`: the body was a client shell
 * filled in from ESI, so `/station/60003760` and `/station/999999999` both
 * answered HTTP 200 with the same 416 words. That is both Search Console
 * complaints at once — 5,211 sitemap URLs a crawler cannot tell apart, and
 * nonexistent stations that never 404.
 */
async function PageContent({
  params,
}: Readonly<{ params: Promise<{ stationId: string }> }>) {
  const { stationId } = await params;
  const id = parsePositiveEntityId(stationId);
  if (id === null) notFound();

  const station = await readStation(id);
  if (!station) notFound();

  return (
    <PageClient
      stationId={id}
      name={station.name}
      solarSystemId={station.solarSystemId}
      typeId={station.typeId}
      raceId={station.raceId}
      ownerId={station.ownerId}
    />
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ stationId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
