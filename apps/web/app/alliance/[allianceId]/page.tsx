import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allianceId: string }>;
}): Promise<Metadata> {
  const { allianceId } = await params;
  const id = parsePositiveEntityId(allianceId);
  if (id === null) return {};
  try {
    const alliance = (await getAlliancesAllianceId(id)).data;

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

    return pageMetadata({
      title: alliance.name,
      description: `${alliance.name} <${alliance.ticker}> is an EVE Online alliance${foundedOn}. View its member corporations, contacts, and public record.`,
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
  if (parsePositiveEntityId(allianceId) === null) notFound();
  return <PageClient />;
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
