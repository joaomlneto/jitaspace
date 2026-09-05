import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionId: string }>;
}): Promise<Metadata> {
  const { regionId } = await params;
  const id = parsePositiveEntityId(regionId);
  if (id === null) return {};
  try {
    const region = await prisma.region.findUnique({
      select: {
        name: true,
        description: true,
        _count: { select: { constellations: true } },
      },
      where: { regionId: id },
    });
    if (!region) return {};

    const constellations = region._count.constellations;

    return pageMetadata({
      title: region.name,
      description: toDescription(
        region.description,
        `${region.name} region in EVE Online. Browse its constellations, solar systems, and market activity.`,
      ),
      path: `/region/${id}`,
      badge: "Region",
      facts: constellations
        ? [{ label: "Constellations", value: String(constellations) }]
        : [],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ regionId: string }>;
}>) {
  const { regionId } = await params;
  if (parsePositiveEntityId(regionId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ regionId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
