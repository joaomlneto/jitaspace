import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bloodlineId: string }>;
}): Promise<Metadata> {
  const { bloodlineId } = await params;
  const id = parsePositiveEntityId(bloodlineId);
  if (id === null) return {};
  try {
    const bloodline = await prisma.bloodline.findUnique({
      select: { name: true, description: true },
      where: { bloodlineId: id },
    });
    if (!bloodline) return {};
    return {
      title: bloodline.name,
      description: bloodline.description.slice(0, 200),
      alternates: { canonical: `/bloodline/${id}` },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ bloodlineId: string }>;
}>) {
  const { bloodlineId } = await params;
  if (parsePositiveEntityId(bloodlineId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ bloodlineId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
