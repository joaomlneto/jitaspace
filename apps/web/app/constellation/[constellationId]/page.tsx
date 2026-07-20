import { Suspense } from "react";
import type { Metadata } from "next";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constellationId: string }>;
}): Promise<Metadata> {
  const { constellationId } = await params;
  const id = Number(constellationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const constellation = await prisma.constellation.findUnique({
      select: { name: true },
      where: { constellationId: id },
    });
    if (!constellation) return {};
    return {
      title: constellation.name,
      description: `${constellation.name} constellation in EVE Online.`,
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
