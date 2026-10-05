import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { formatInteger } from "~/lib/format";
import { eveImage, pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { loadCorporationProfile } from "./data";
import { readEsiAllianceName, readEsiCorporation } from "./esi";
import PageClient from "./page.client";
import { splitCorporationProfile } from "./split";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}): Promise<Metadata> {
  const { corporationId } = await params;
  const id = parsePositiveEntityId(corporationId);
  if (id === null) return {};

  try {
    const corporation = await readEsiCorporation(id);

    let alliance: string | undefined;
    if (corporation.allianceId) {
      try {
        alliance = await readEsiAllianceName(corporation.allianceId);
      } catch {
        // An unreachable alliance just means one fewer fact on the card.
      }
    }

    const tickerSuffix = corporation.ticker ? ` [${corporation.ticker}]` : "";

    return pageMetadata({
      title: corporation.name,
      description: toDescription(
        corporation.description,
        `${corporation.name}${tickerSuffix} is an EVE Online corporation. View its members, alliance history, wars and killboard.`,
      ),
      path: `/corporation/${id}`,
      badge: "Corporation",
      image: eveImage.corporation(id),
      facts: [
        ...(corporation.ticker
          ? [{ label: "Ticker", value: corporation.ticker }]
          : []),
        // Explicit locale: the server's default would make the card text vary
        // by host, and these URLs are cached.
        { label: "Members", value: formatInteger(corporation.memberCount) },
        ...(alliance ? [{ label: "Alliance", value: alliance }] : []),
      ],
    });
  } catch {
    return {};
  }
}

// ISR: each corporation's page is cached whole and revalidated on its reads'
// `cacheLife("hours")`. Without `generateStaticParams` (plus
// `experimental.partialFallbacks`, next.config.mjs) Next 16.2 would serve an
// unlisted corporation from the fallback shell and re-render it on every
// request.
//
// The corporations live in the database, which `next build` cannot reach in
// CI, and Cache Components rejects an empty list, so this lists one id
// `parsePositiveEntityId` refuses: it prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ corporationId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ corporationId: string }> }>) {
  const { corporationId } = await params;
  const id = parsePositiveEntityId(corporationId);
  if (id === null) notFound();
  const result = await loadCorporationProfile(id);
  // The database failed: render the ESI-only page for this request, but keep
  // it out of the ISR cache, so the next request tries the database again.
  if (!result.ok) await connection();
  const profile = result.ok ? result.profile : null;
  // The table rows stay behind `/api/corporation/[corporationId]`; the page
  // carries the identity, the NPC details and the counts.
  const page = profile ? splitCorporationProfile(profile).page : null;
  // nuqs's React adapter, not the app-wide Next one, whose `useSearchParams()`
  // would leave only the skeleton in the cached HTML.
  return (
    <NuqsAdapter>
      <PageClient corporationId={id} profile={page} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ corporationId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
