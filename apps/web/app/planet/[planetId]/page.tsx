import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planetId: string }>;
}): Promise<Metadata> {
  const { planetId } = await params;
  const id = Number(planetId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const planet = await prisma.planet.findUnique({
      select: { name: true },
      where: { planetId: id },
    });
    if (!planet) return {};
    return {
      title: planet.name,
      description: `${planet.name} planet in EVE Online.`,
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
