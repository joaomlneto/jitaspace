import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import { pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getCachedBuildPage } from "./data";
import BuildHistoryClient from "./page.client";

// A build number is `Build.buildNumber Int @id` in the history schema — the
// same shape as an entity id, so the same parser applies. Before this the
// segment was coerced with `Number()`, so `/history/build/03383521` and
// `/history/build/nonsense` both rendered HTTP 200: the first a duplicate of
// the real build page, the second an empty state — a soft 404.
export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  const buildNumber = parsePositiveEntityId(build);
  if (buildNumber === null) return {};
  return pageMetadata({
    title: `Build ${buildNumber} — Change History`,
    description: `Everything that changed in EVE Online client build ${buildNumber}.`,
    path: `/history/build/${buildNumber}`,
    badge: "Change History",
  });
}

// ISR for builds that are not known at build time. Next 16.2 serves an
// unlisted param from the route's fallback shell and re-renders everything after
// `await params` on every request — unless the segment has
// `generateStaticParams` and `experimental.partialFallbacks` is on
// (next.config.mjs). Then the first request also renders the full page in the
// background, and later requests are served that page from the ISR cache,
// revalidated on the reads' `cacheLife("days")`.
//
// The real builds live in the history DB, which `next build` cannot reach (CI
// has none), and Cache Components rejects an empty list — so this lists one
// number `parsePositiveEntityId` refuses, which prerenders as a 404 without a
// query.
export function generateStaticParams() {
  return [{ build: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  const buildNumber = parsePositiveEntityId(build);
  if (buildNumber === null) notFound();
  const data = await getCachedBuildPage(buildNumber);
  if (data === null) notFound();
  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render, so
  // the ISR page would hold only the loader and draw every list in the browser.
  // The React adapter reads `location.search` after hydration instead — the
  // cached page is complete and the collection filter still lives in the URL.
  return (
    <NuqsAdapter>
      <BuildHistoryClient data={data} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
