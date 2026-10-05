import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getTypeList } from "./data";
import TypeListPage from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ typeListId: string }>;
}>): Promise<Metadata> {
  const { typeListId: typeListIdParam } = await params;
  const typeListId = parsePositiveEntityId(typeListIdParam);
  if (typeListId === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const typeList = await getTypeList(typeListId);
  if (typeList === null) return {};
  const title = typeList.displayName ?? typeList.name;
  return pageMetadata({
    title: `${title} — Type List`,
    description: toDescription(
      typeList.displayDescription,
      `The ${typeList.members.length.toLocaleString("en-US")} EVE Online items in the "${typeList.name}" type list, and the rules that define it.`,
    ),
    path: `/type-list/${typeListId}`,
    badge: "Type List",
    facts: [
      {
        label: "Members",
        value: typeList.members.length.toLocaleString("en-US"),
      },
    ],
  });
}

// ISR per list: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route").
// The real ids live in the database, which `next build` cannot reach in CI,
// and Cache Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ typeListId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ typeListId: string }>;
}>) {
  const { typeListId: typeListIdParam } = await params;
  const typeListId = parsePositiveEntityId(typeListIdParam);
  if (typeListId === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a list that genuinely does not exist.
  const typeList = await getTypeList(typeListId);
  if (typeList === null) notFound();
  return <TypeListPage typeList={typeList} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ typeListId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
