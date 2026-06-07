import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ systemId: string }>;
}): Promise<Metadata> {
  const { systemId } = await params;
  const id = Number(systemId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const system = await prisma.solarSystem.findUnique({
      select: { name: true },
      where: { solarSystemId: id },
    });
    if (!system) return {};
    return {
      title: system.name,
      description: `${system.name} solar system in EVE Online.`,
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
