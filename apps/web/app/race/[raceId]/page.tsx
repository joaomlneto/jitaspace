import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}): Promise<Metadata> {
  const { raceId } = await params;
  const id = parsePositiveEntityId(raceId);
  if (id === null) return {};
  try {
    const race = await prisma.race.findUnique({
      select: {
        name: true,
        description: true,
        shipTypeId: true,
        faction: { select: { name: true } },
      },
      where: { raceId: id },
    });
    if (!race) return {};

    return pageMetadata({
      title: race.name,
      description: toDescription(
        race.description,
        `The ${race.name} race in EVE Online — its bloodlines, ships, and place in New Eden.`,
      ),
      path: `/race/${id}`,
      badge: "Race",
      // The race's starter hull is the closest thing a race has to a portrait.
      image: race.shipTypeId
        ? await resolveTypeImage(race.shipTypeId)
        : undefined,
      facts: race.faction
        ? [{ label: "Faction", value: race.faction.name }]
        : [],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ raceId: string }>;
}>) {
  const { raceId } = await params;
  if (parsePositiveEntityId(raceId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ raceId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
