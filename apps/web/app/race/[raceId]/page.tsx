import { Suspense } from "react";
import type { Metadata } from "next";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}): Promise<Metadata> {
  const { raceId } = await params;
  const id = Number(raceId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const race = await prisma.race.findUnique({
      select: { name: true, description: true },
      where: { raceId: id },
    });
    if (!race) return {};
    return {
      title: race.name,
      description: race.description?.slice(0, 200) ?? undefined,
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
