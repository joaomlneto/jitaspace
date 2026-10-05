import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NuqsAdapter } from "nuqs/adapters/react";

import type { AllianceProfile } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { loadAllianceProfile } from "./data";
import { readEsiAlliance, readEsiCorporationName } from "./esi";
import PageClient from "./page.client";

const count = (n: number) => n.toLocaleString("en-US");

/** "It has 400 pilots in 2 corporations and holds sovereignty over 2 systems." */
function describeSize({ corporations, sovereignty }: AllianceProfile): string {
  const pilots = corporations.reduce(
    (sum, corporation) => sum + corporation.memberCount,
    0,
  );
  const sov =
    sovereignty.length > 0
      ? ` and holds sovereignty over ${count(sovereignty.length)} systems`
      : "";
  return `It has ${count(pilots)} pilots in ${count(corporations.length)} corporations${sov}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allianceId: string }>;
}): Promise<Metadata> {
  const { allianceId } = await params;
  const id = parsePositiveEntityId(allianceId);
  if (id === null) return {};
  try {
    const [alliance, profileResult] = await Promise.all([
      readEsiAlliance(id),
      loadAllianceProfile(id),
    ]);
    const profile = profileResult.ok ? profileResult.profile : null;

    let executor: string | undefined;
    if (alliance.executorCorporationId) {
      try {
        executor = await readEsiCorporationName(alliance.executorCorporationId);
      } catch {
        // An unreachable corporation just means one fewer fact on the card.
      }
    }

    const founded = alliance.dateFounded.slice(0, 10);

    const foundedOn = founded ? `, founded ${founded}` : "";

    const size = profile ? ` ${describeSize(profile)}` : "";

    return pageMetadata({
      title: alliance.name,
      description: `${alliance.name} <${alliance.ticker}> is an EVE Online alliance${foundedOn}.${size} View its member corporations, sovereignty, wars and killboard.`,
      path: `/alliance/${id}`,
      badge: "Alliance",
      image: eveImage.alliance(id),
      facts: [
        { label: "Ticker", value: alliance.ticker },
        ...(executor ? [{ label: "Executor", value: executor }] : []),
        ...(founded ? [{ label: "Founded", value: founded }] : []),
      ],
    });
  } catch {
    return {};
  }
}

// ISR: each alliance's page is cached whole and revalidated on its reads'
// `cacheLife("hours")`, and the hourly job's `/api/revalidate/alliances`
// expires the ones it changed. Without `generateStaticParams` (plus
// `experimental.partialFallbacks`, next.config.mjs) Next 16.2 would serve an
// unlisted alliance from the fallback shell and re-render it on every request.
//
// The alliances live in the database, which `next build` cannot reach in CI,
// and Cache Components rejects an empty list, so this lists one id
// `parsePositiveEntityId` refuses: it prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ allianceId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ allianceId: string }> }>) {
  const { allianceId } = await params;
  const id = parsePositiveEntityId(allianceId);
  if (id === null) notFound();
  const result = await loadAllianceProfile(id);
  // The database failed: render the ESI-only page for this request, but keep
  // it out of the ISR cache, so the next request tries the database again
  // instead of being served the degraded page for the rest of the hour.
  if (!result.ok) await connection();
  // Null when the alliance is not in our database (yet), or the database is
  // unavailable: the page then renders from ESI alone.
  const profile = result.ok ? result.profile : null;
  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render, so
  // the ISR page would hold only the skeleton. The React adapter reads
  // `location.search` after hydration; `?tab=` still lives in the URL.
  return (
    <NuqsAdapter>
      <PageClient allianceId={id} profile={profile} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ allianceId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
