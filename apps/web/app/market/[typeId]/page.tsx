import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";
import MarketTypePage from "./page.client";

/**
 * The marketable type row shared by metadata and the page render. A rejected
 * query is deliberately not caught inside this cache scope, so a database
 * outage cannot become a cached 404.
 */
async function readMarketType(typeId: number) {
  "use cache";
  cacheSdeRead();

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

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
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
}

// ISR per item. The server renders only what never changes between SDE
// ingests (the item's name, its metadata and the page's frame); the orders and
// price history are ESI data the browser fetches, so a cached page is never a
// stale market. Without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]`
// route"), which is what made the per-type route expensive before. The real
// ids live in the database, which `next build` cannot reach in CI, and Cache
// Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ typeId: "0" }];
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

  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads the tab and price-history state after hydration.
  return (
    <NuqsAdapter>
      <MarketTypePage typeId={typeId} typeName={type.name} />
    </NuqsAdapter>
  );
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
