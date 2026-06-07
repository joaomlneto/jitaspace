import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "~/lib/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionId: string }>;
}): Promise<Metadata> {
  const { regionId } = await params;
  const id = Number(regionId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const region = await prisma.region.findUnique({
      select: { name: true, description: true },
      where: { regionId: id },
    });
    if (!region) return {};
    return {
      title: region.name,
      description: region.description?.slice(0, 200) ?? `${region.name} region in EVE Online.`,
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
