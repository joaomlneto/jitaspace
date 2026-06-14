import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import MarketTypePage from "./page.client";

async function getMarketTypeName(typeId: number): Promise<string> {
  "use cache";
  cacheLife("days");

  const type = await prisma.type.findUniqueOrThrow({
    select: { name: true },
    where: { typeId },
  });
  return type.name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ typeId: string }>;
}): Promise<Metadata> {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!Number.isSafeInteger(typeId) || typeId <= 0) return {};

  try {
    const name = await getMarketTypeName(typeId);
    return {
      title: `${name} — Market`,
      description: `Live buy and sell orders for ${name} across New Eden's market hubs.`,
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!Number.isSafeInteger(typeId) || typeId <= 0) {
    notFound();
  }

  let name: string;
  try {
    name = await getMarketTypeName(typeId);
  } catch {
    notFound();
  }

  return <MarketTypePage typeId={typeId} typeName={name} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
