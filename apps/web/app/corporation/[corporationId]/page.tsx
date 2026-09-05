import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}): Promise<Metadata> {
  const { corporationId } = await params;
  const id = parsePositiveEntityId(corporationId);
  if (id === null) return {};

  try {
    const corporation = (await getCorporationsCorporationId(id)).data;

    let alliance: string | undefined;
    if (corporation.alliance_id) {
      try {
        alliance = (await getAlliancesAllianceId(corporation.alliance_id)).data
          .name;
      } catch {
        // An unreachable alliance just means one fewer fact on the card.
      }
    }

    return pageMetadata({
      title: corporation.name,
      description: toDescription(
        corporation.description,
        `${corporation.name}${
          corporation.ticker ? ` [${corporation.ticker}]` : ""
        } is an EVE Online corporation. View its members, alliance history, and public record.`,
      ),
      path: `/corporation/${id}`,
      badge: "Corporation",
      image: eveImage.corporation(id),
      facts: [
        ...(corporation.ticker
          ? [{ label: "Ticker", value: corporation.ticker }]
          : []),
        ...(typeof corporation.member_count === "number"
          ? [
              {
                label: "Members",
                // Explicit locale: the server's default would make the card
                // text vary by host, and these URLs are cached.
                value: corporation.member_count.toLocaleString("en-US"),
              },
            ]
          : []),
        ...(alliance ? [{ label: "Alliance", value: alliance }] : []),
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ corporationId: string }> }>) {
  const { corporationId } = await params;
  if (parsePositiveEntityId(corporationId) === null) notFound();
  return <PageClient />;
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
