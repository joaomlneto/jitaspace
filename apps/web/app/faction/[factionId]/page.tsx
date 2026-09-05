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
  params: Promise<{ factionId: string }>;
}): Promise<Metadata> {
  const { factionId } = await params;
  const id = parsePositiveEntityId(factionId);
  if (id === null) return {};
  try {
    const faction = await prisma.faction.findUnique({
      select: { name: true, description: true },
      where: { factionId: id },
    });
    if (!faction) return {};
    return {
      title: faction.name,
      description: faction.description.slice(0, 200),
      alternates: { canonical: `/faction/${id}` },
    };
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
