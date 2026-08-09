import type { Metadata } from "next";
import { Suspense } from "react";

import type { SolarSystemSdeInfo } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ systemId: string }>;
}): Promise<Metadata> {
  const { systemId } = await params;
  const id = Number(systemId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const system = await prisma.solarSystem.findUnique({
      select: { name: true },
      where: { solarSystemId: id },
    });
    if (!system) return {};
    return {
      title: system.name,
      description: `${system.name} solar system in EVE Online.`,
    };
  } catch {
    return {};
  }
}

/**
 * Read the SDE columns of a system from our database. Returns null for an
 * unknown id or a database hiccup — the page renders fine without this half,
 * exactly as it did while the data came from a client-side SDE request.
 */
async function getSolarSystemSdeInfo(
  systemId: number,
): Promise<SolarSystemSdeInfo | null> {
  if (!Number.isSafeInteger(systemId) || systemId <= 0) return null;
  try {
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
  } catch {
    return null;
  }
}

/**
 * The database read lives here rather than in `Page` so it happens *inside* the
 * Suspense boundary. Awaiting it in `Page` would put uncached data outside the
 * boundary, which blocks the whole route from prerendering.
 */
async function PageContent({
  params,
}: Readonly<{ params: Promise<{ systemId: string }> }>) {
  const { systemId } = await params;
  const sde = await getSolarSystemSdeInfo(Number(systemId));

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
