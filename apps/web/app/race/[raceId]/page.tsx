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
  params: Promise<{ raceId: string }>;
}): Promise<Metadata> {
  const { raceId } = await params;
  const id = parsePositiveEntityId(raceId);
  if (id === null) return {};
  try {
    const race = await prisma.race.findUnique({
      select: { name: true, description: true },
      where: { raceId: id },
    });
    if (!race) return {};
    return {
      title: race.name,
      description: race.description?.slice(0, 200) ?? undefined,
      alternates: { canonical: `/race/${id}` },
    };
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
