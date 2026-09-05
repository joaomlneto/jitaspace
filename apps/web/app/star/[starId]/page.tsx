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
  params: Promise<{ starId: string }>;
}): Promise<Metadata> {
  const { starId } = await params;
  const id = parsePositiveEntityId(starId);
  if (id === null) return {};
  try {
    const star = await prisma.star.findUnique({
      select: { name: true },
      where: { starId: id },
    });
    if (!star) return {};
    return {
      title: star.name,
      description: `${star.name} star in EVE Online.`,
      alternates: { canonical: `/star/${id}` },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ starId: string }>;
}>) {
  const { starId } = await params;
  if (parsePositiveEntityId(starId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ starId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
