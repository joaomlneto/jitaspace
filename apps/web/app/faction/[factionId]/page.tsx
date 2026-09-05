import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { eveImage, pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ factionId: string }>;
}): Promise<Metadata> {
  const { factionId } = await params;
  const id = parsePositiveEntityId(factionId);
  if (id === null) return {};
  try {
    const faction = await prisma.faction.findUnique({
      select: {
        name: true,
        description: true,
        corporationId: true,
        stationCount: true,
        militiaCorporation: { select: { name: true } },
      },
      where: { factionId: id },
    });
    if (!faction) return {};

    return pageMetadata({
      title: faction.name,
      description: toDescription(
        faction.description,
        `${faction.name} in EVE Online.`,
      ),
      path: `/faction/${id}`,
      badge: "Faction",
      // Factions have no artwork of their own on the image CDN; their holding
      // corporation's logo is the emblem players recognise.
      image: faction.corporationId
        ? eveImage.corporation(faction.corporationId)
        : undefined,
      facts: [
        ...(faction.stationCount
          ? [{ label: "Stations", value: String(faction.stationCount) }]
          : []),
        ...(faction.militiaCorporation
          ? [{ label: "Militia", value: faction.militiaCorporation.name }]
          : []),
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ factionId: string }>;
}>) {
  const { factionId } = await params;
  if (parsePositiveEntityId(factionId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ factionId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
