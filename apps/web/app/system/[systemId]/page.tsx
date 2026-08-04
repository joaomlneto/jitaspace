import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import type { SolarSystemSdeInfo } from "./page.client";
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
 * The SDE-only columns for a system. Static between SDE releases, so this is
 * cached for a day rather than fetched per visit like it used to be from the
 * SDE API.
 */
async function getSolarSystemSdeInfo(
  solarSystemId: number,
): Promise<SolarSystemSdeInfo | undefined> {
  "use cache";
  cacheLife("days");

  const system = await prisma.solarSystem.findUnique({
    select: {
      luminosity: true,
      radius: true,
      positionX: true,
      positionY: true,
      positionZ: true,
      wormholeClassId: true,
      factionId: true,
      isBorder: true,
      isCorridor: true,
      isFringe: true,
      isHub: true,
      isRegional: true,
      isInternational: true,
    },
    where: { solarSystemId },
  });

  return system ?? undefined;
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ systemId: string }> }>) {
  const { systemId } = await params;
  const id = Number(systemId);
  const sde =
    Number.isSafeInteger(id) && id > 0
      ? await getSolarSystemSdeInfo(id).catch(() => undefined)
      : undefined;

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
