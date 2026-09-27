import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import MarketTypePage from "./page.client";

/**
 * The marketable type row shared by metadata and the page render. A rejected
 * query is deliberately not caught inside this cache scope, so a database
 * outage cannot become a day-long cached 404.
 */
async function readMarketType(typeId: number) {
  "use cache";
  cacheLife("days");

  const type = await prisma.type.findUnique({
    select: {
      name: true,
      marketGroupId: true,
      group: { select: { name: true, category: { select: { name: true } } } },
    },
    where: { typeId },
  });

  return type?.marketGroupId == null ? null : type;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ typeId: string }>;
}): Promise<Metadata> {
  const { typeId: rawTypeId } = await params;
  const typeId = parsePositiveEntityId(rawTypeId);
  if (typeId === null) return {};

  try {
    const type = await readMarketType(typeId);
    if (!type) return {};

    return pageMetadata({
      title: `${type.name} Market`,
      description: `Live buy and sell orders for ${type.name} across New Eden's market hubs.`,
      path: `/market/${typeId}`,
      badge: "Market",
      image: await resolveTypeImage(typeId),
      facts: [
        { label: "Group", value: type.group.name },
        { label: "Category", value: type.group.category.name },
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId: rawTypeId } = await params;
  const typeId = parsePositiveEntityId(rawTypeId);
  if (typeId === null) notFound();

  const type = await readMarketType(typeId);
  if (!type) notFound();

  return <MarketTypePage typeId={typeId} typeName={type.name} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
