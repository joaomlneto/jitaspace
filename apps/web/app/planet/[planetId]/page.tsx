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
  params: Promise<{ planetId: string }>;
}): Promise<Metadata> {
  const { planetId } = await params;
  const id = parsePositiveEntityId(planetId);
  if (id === null) return {};
  try {
    const planet = await prisma.planet.findUnique({
      select: { name: true },
      where: { planetId: id },
    });
    if (!planet) return {};
    return {
      title: planet.name,
      description: `${planet.name} planet in EVE Online.`,
      alternates: { canonical: `/planet/${id}` },
    };
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
