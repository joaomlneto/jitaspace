import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { SolarSystemSdeInfo } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, withArticle } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ systemId: string }>;
}): Promise<Metadata> {
  const { systemId } = await params;
  const id = parsePositiveEntityId(systemId);
  if (id === null) return {};
  try {
    const system = await prisma.solarSystem.findUnique({
      select: {
        name: true,
        securityStatus: true,
        constellation: {
          select: { name: true, region: { select: { name: true } } },
        },
      },
      where: { solarSystemId: id },
    });
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
  } catch {
    return {};
  }
}

/**
 * Read the SDE columns of a system from our database. Returns null for an
 * unknown id.
 *
 * Cached for days, like the type page's dogma metadata: these columns only
 * change when a new SDE release is ingested. A failure throws rather than
 * degrading here, so a database blip is never what gets written into the
 * day-long cache entry — the caller catches it instead.
 */
async function readSolarSystemSdeInfo(
  systemId: number,
): Promise<SolarSystemSdeInfo | null> {
  "use cache";
  cacheLife("days");

  if (!Number.isSafeInteger(systemId) || systemId <= 0) return null;

  const system = await prisma.solarSystem.findUnique({
    select: {
      luminosity: true,
      radius: true,
      wormholeClassId: true,
      positionX: true,
      positionY: true,
      positionZ: true,
      factionId: true,
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
    luminosity: system.luminosity,
    radius: system.radius,
    wormholeClassId: system.wormholeClassId,
    position:
      positionX != null && positionY != null && positionZ != null
        ? { x: positionX, y: positionY, z: positionZ }
        : null,
    factionId: system.factionId,
    isHub: system.isHub ?? false,
    isBorder: system.isBorder ?? false,
    isFringe: system.isFringe ?? false,
    isCorridor: system.isCorridor ?? false,
    isInternational: system.isInternational ?? false,
    isRegional: system.isRegional ?? false,
  };
}

/**
 * The page renders fine without this half, exactly as it did while the data
 * came from a client-side SDE request, so a database failure degrades to null
 * instead of erroring the route.
 */
async function getSolarSystemSdeInfo(
  systemId: number,
): Promise<SolarSystemSdeInfo | null> {
  try {
    return await readSolarSystemSdeInfo(systemId);
  } catch {
    return null;
  }
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
  const sde = await getSolarSystemSdeInfo(id);

  return <PageClient sde={sde} />;
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
