import { Suspense } from "react";
import type { Metadata } from "next";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ starId: string }>;
}): Promise<Metadata> {
  const { starId } = await params;
  const id = Number(starId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const star = await prisma.star.findUnique({
      select: { name: true },
      where: { starId: id },
    });
    if (!star) return {};
    return {
      title: star.name,
      description: `${star.name} star in EVE Online.`,
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
