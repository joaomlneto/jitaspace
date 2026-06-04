import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bloodlineId: string }>;
}): Promise<Metadata> {
  const { bloodlineId } = await params;
  const id = Number(bloodlineId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const bloodline = await prisma.bloodline.findUnique({
      select: { name: true, description: true },
      where: { bloodlineId: id },
    });
    if (!bloodline) return {};
    return {
      title: bloodline.name,
      description: bloodline.description?.slice(0, 200) ?? undefined,
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
