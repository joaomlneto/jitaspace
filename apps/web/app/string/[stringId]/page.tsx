import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getCachedStringHistory } from "./data";
import StringHistoryPage from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ stringId: string }>;
}>): Promise<Metadata> {
  const { stringId: raw } = await params;
  const stringId = parsePositiveEntityId(raw);
  if (stringId === null) return {};

  let english: string | undefined;
  try {
    const history = await getCachedStringHistory(stringId);
    const latest = history?.events.filter((e) => e.lang === "en-us").at(-1);
    english = latest?.to ?? latest?.from;
  } catch {
    // The page itself throws on the same failure; the metadata just goes
    // without the excerpt.
  }
  return pageMetadata({
    title: `String ${stringId} — Change History`,
    description: toDescription(
      english,
      `How EVE Online localization string ${stringId} changed across client builds, in every language.`,
    ),
    path: `/string/${stringId}`,
    badge: "Change History",
  });
}

// ISR, as for /history/build/[build]: the history DB is unreachable at build
// time (CI has none), so the only prerendered param is one the page 404s before
// querying; real strings are rendered on first request and cached.
export function generateStaticParams() {
  return [{ stringId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ stringId: string }>;
}>) {
  const { stringId: raw } = await params;
  const stringId = parsePositiveEntityId(raw);
  if (stringId === null) notFound();
  const history = await getCachedStringHistory(stringId);
  if (history === null) notFound();
  // nuqs's React adapter keeps the cached ISR page complete; see the build page.
  return (
    <NuqsAdapter>
      <StringHistoryPage history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ stringId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
