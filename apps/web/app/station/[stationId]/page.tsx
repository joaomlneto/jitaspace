import { Suspense } from "react";
import type { Metadata } from "next";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stationId: string }>;
}): Promise<Metadata> {
  const { stationId } = await params;
  const id = Number(stationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const station = await prisma.station.findUnique({
      select: { name: true },
      where: { stationId: id },
    });
    if (!station) return {};
    return {
      title: station.name,
      description: `${station.name} station in EVE Online.`,
    };
  } catch {
    return {};
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
