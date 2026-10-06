import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import { getCachedEntityHistory } from "~/lib/history-entity-page";
import { pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import SkinMaterialHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  const { skinMaterialId } = await params;
  const id = parsePositiveEntityId(skinMaterialId);
  if (id === null) return {};
  const { name } = await getCachedEntityHistory("skinMaterial", id);
  return pageMetadata({
    title: `${name ?? `Skin material ${id}`} — Change History`,
    description: `How EVE Online skin material ${name ?? id} has changed across client builds.`,
    path: `/history/skinMaterial/${id}`,
    badge: "Change History",
  });
}

// ISR, like `/history/build/[build]` (see its page.tsx): the page is cached
// whole per skin material after its first request. The history DB is unreachable
// from CI, so this lists one id `parsePositiveEntityId` refuses, which 404s
// without a query.
export function generateStaticParams() {
  return [{ skinMaterialId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  const { skinMaterialId } = await params;
  const id = parsePositiveEntityId(skinMaterialId);
  if (id === null) notFound();
  // Uncaught: the page is cached whole, so a database failure must throw
  // rather than store a broken page.
  const history = await getCachedEntityHistory("skinMaterial", id);
  // nuqs's React adapter keeps the cached page complete; see apps/web/CLAUDE.md
  // → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <SkinMaterialHistoryClient history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
