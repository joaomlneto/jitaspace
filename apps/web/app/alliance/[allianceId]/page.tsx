import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import type { AllianceProfile } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getAllianceProfile } from "./data";
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
    const [{ data: alliance }, profile] = await Promise.all([
      getAlliancesAllianceId(id),
      getAllianceProfile(id),
    ]);

    let executor: string | undefined;
    if (alliance.executor_corporation_id) {
      try {
        executor = (
          await getCorporationsCorporationId(alliance.executor_corporation_id)
        ).data.name;
      } catch {
        // An unreachable corporation just means one fewer fact on the card.
      }
    }

    const founded = alliance.date_founded.slice(0, 10);

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

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ allianceId: string }> }>) {
  const { allianceId } = await params;
  const id = parsePositiveEntityId(allianceId);
  if (id === null) notFound();
  // Null when the alliance is not in our database yet, or the database is
  // unavailable: the page then renders from ESI alone.
  const profile = await getAllianceProfile(id);
  return <PageClient allianceId={id} profile={profile} />;
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
