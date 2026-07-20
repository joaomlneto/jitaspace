import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ factionId: string }>;
}): Promise<Metadata> {
  const { factionId } = await params;
  const id = Number(factionId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const faction = await prisma.faction.findUnique({
      select: { name: true, description: true },
      where: { factionId: id },
    });
    if (!faction) return {};
    return {
      title: faction.name,
      description: faction.description.slice(0, 200),
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
