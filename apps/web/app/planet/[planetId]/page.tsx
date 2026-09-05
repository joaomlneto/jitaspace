import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planetId: string }>;
}): Promise<Metadata> {
  const { planetId } = await params;
  const id = parsePositiveEntityId(planetId);
  if (id === null) return {};
  try {
    const planet = await prisma.planet.findUnique({
      select: {
        name: true,
        typeId: true,
        type: { select: { name: true } },
        solarSystem: { select: { name: true } },
        _count: { select: { moons: true } },
      },
      where: { planetId: id },
    });
    if (!planet) return {};

    const kind = planet.type.name;
    const system = planet.solarSystem.name;

    return pageMetadata({
      title: planet.name,
      description: `${planet.name} is a${kind ? ` ${kind}` : " planet"}${
        system ? ` in the ${system} solar system` : ""
      } of EVE Online.`,
      path: `/planet/${id}`,
      badge: "Planet",
      image: await resolveTypeImage(planet.typeId),
      facts: [
        ...(kind ? [{ label: "Type", value: kind }] : []),
        ...(system ? [{ label: "System", value: system }] : []),
        ...(planet._count.moons
          ? [{ label: "Moons", value: String(planet._count.moons) }]
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
  params: Promise<{ planetId: string }>;
}>) {
  const { planetId } = await params;
  if (parsePositiveEntityId(planetId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ planetId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
