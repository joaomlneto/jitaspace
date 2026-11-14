import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import type { SolarSystemSdeInfo } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { systemFactionId, systemFactionSelect } from "~/lib/factionTerritory";
import { pageMetadata, withArticle } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";
import PageClient from "./page.client";

/**
 * What the system's title and card say. Cached until the next SDE ingest, and
 * uncaught: this page is cached whole, so a failed query throws rather than
 * storing generic metadata, and only a genuinely unknown id returns null.
 */
async function readSolarSystemMetadata(systemId: number) {
  "use cache";
  cacheSdeRead();

  return prisma.solarSystem.findUnique({
    select: {
      name: true,
      securityStatus: true,
      constellation: {
        select: { name: true, region: { select: { name: true } } },
      },
    },
    where: { solarSystemId: systemId },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ systemId: string }>;
}): Promise<Metadata> {
  const { systemId } = await params;
  const id = parsePositiveEntityId(systemId);
  if (id === null) return {};
  const system = await readSolarSystemMetadata(id);
  if (!system) return {};

  // EVE rounds security to one decimal everywhere it's displayed, and the
  // rounded value is what determines high/low/null-sec rules.
  const securityValue = Number(system.securityStatus);
  const security = Number.isFinite(securityValue)
    ? securityValue.toFixed(1)
    : undefined;
  const region = system.constellation.region?.name;

  const securityPhrase = security ? `${security} security ` : "";
  const inRegion = region ? ` in ${withArticle(region)} region` : "";

  return pageMetadata({
    title: system.name,
    description: `${system.name} is a ${securityPhrase}solar system${inRegion} of EVE Online. Browse its stations, planets, and market activity.`,
    path: `/system/${id}`,
    badge: "Solar System",
    facts: [
      ...(security ? [{ label: "Security", value: security }] : []),
      ...(region ? [{ label: "Region", value: region }] : []),
      { label: "Constellation", value: system.constellation.name },
    ],
  });
}

// ISR per system. The server renders the system's SDE half; everything live
// (sovereignty, jumps, kills, incursions, faction warfare) is ESI data the
// browser fetches, so a cached page is never a stale system. Without
// `generateStaticParams` an unlisted id re-renders on every request (see
// apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route"). The real ids live
// in the database, which `next build` cannot reach in CI, and Cache Components
// rejects an empty list — so this lists one id `parsePositiveEntityId`
// refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ systemId: "0" }];
}

interface SolarSystemPageData {
  name: string;
  sde: SolarSystemSdeInfo;
}

/**
 * Read the system identity and SDE columns from our database. Returns null for
 * an unknown id.
 *
 * Cached until the next SDE build is ingested, like the type page's dogma
 * metadata: that is the only time these columns change. A failure throws
 * rather than degrading here, so a database blip is never mistaken for a
 * missing system and written into a cached 404.
 */
async function readSolarSystemPageData(
  systemId: number,
): Promise<SolarSystemPageData | null> {
  "use cache";
  cacheSdeRead();

  if (!Number.isSafeInteger(systemId) || systemId <= 0) return null;

  const system = await prisma.solarSystem.findUnique({
    select: {
      name: true,
      luminosity: true,
      radius: true,
      wormholeClassId: true,
      positionX: true,
      positionY: true,
      positionZ: true,
      ...systemFactionSelect,
      isHub: true,
      isBorder: true,
      isFringe: true,
      isCorridor: true,
      isInternational: true,
      isRegional: true,
    },
    where: { solarSystemId: systemId },
  });
  if (!system) return null;

  const { positionX, positionY, positionZ } = system;
  return {
    name: system.name,
    sde: {
      luminosity: system.luminosity,
      radius: system.radius,
      wormholeClassId: system.wormholeClassId,
      position:
        positionX != null && positionY != null && positionZ != null
          ? { x: positionX, y: positionY, z: positionZ }
          : null,
      // Mostly inherited: few systems carry a faction of their own.
      factionId: systemFactionId(system),
      isHub: system.isHub ?? false,
      isBorder: system.isBorder ?? false,
      isFringe: system.isFringe ?? false,
      isCorridor: system.isCorridor ?? false,
      isInternational: system.isInternational ?? false,
      isRegional: system.isRegional ?? false,
    },
  };
}

/**
 * The database read lives here rather than in `Page` so it happens *inside* the
 * Suspense boundary, alongside `params`.
 */
async function PageContent({
  params,
}: Readonly<{ params: Promise<{ systemId: string }> }>) {
  const { systemId } = await params;
  const id = parsePositiveEntityId(systemId);
  if (id === null) notFound();
  const system = await readSolarSystemPageData(id);
  if (!system) notFound();

  return <PageClient systemId={id} systemName={system.name} sde={system.sde} />;
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ systemId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
