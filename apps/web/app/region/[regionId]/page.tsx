import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
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
      select: { name: true, description: true },
      where: { regionId: id },
    });
    if (!region) return {};
    return {
      title: region.name,
      description:
        region.description?.slice(0, 200) ??
        `${region.name} region in EVE Online.`,
      alternates: { canonical: `/region/${id}` },
    };
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
