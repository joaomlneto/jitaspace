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
  params: Promise<{ bloodlineId: string }>;
}): Promise<Metadata> {
  const { bloodlineId } = await params;
  const id = parsePositiveEntityId(bloodlineId);
  if (id === null) return {};
  try {
    const bloodline = await prisma.bloodline.findUnique({
      select: {
        name: true,
        description: true,
        shipTypeId: true,
        race: { select: { name: true } },
        corporation: { select: { name: true } },
      },
      where: { bloodlineId: id },
    });
    if (!bloodline) return {};

    return pageMetadata({
      title: bloodline.name,
      description: toDescription(
        bloodline.description,
        `The ${bloodline.name} bloodline in EVE Online.`,
      ),
      path: `/bloodline/${id}`,
      badge: "Bloodline",
      image: bloodline.shipTypeId
        ? await resolveTypeImage(bloodline.shipTypeId)
        : undefined,
      facts: [
        { label: "Race", value: bloodline.race.name },
        { label: "Corporation", value: bloodline.corporation.name },
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ bloodlineId: string }>;
}>) {
  const { bloodlineId } = await params;
  if (parsePositiveEntityId(bloodlineId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ bloodlineId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
