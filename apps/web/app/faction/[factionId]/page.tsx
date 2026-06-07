import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

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
      description: faction.description?.slice(0, 200) ?? undefined,
    };
  } catch {
    return {};
  }
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
