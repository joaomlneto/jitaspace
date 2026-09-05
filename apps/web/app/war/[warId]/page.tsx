import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
  getWarsWarId,
} from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

/** A war side is either a corporation or an alliance, never both. */
interface WarSide {
  alliance_id?: number;
  corporation_id?: number;
}

async function describeSide(
  side: WarSide,
): Promise<{ name?: string; image?: string }> {
  try {
    if (side.alliance_id) {
      return {
        name: (await getAlliancesAllianceId(side.alliance_id)).data.name,
        image: eveImage.alliance(side.alliance_id),
      };
    }
    if (side.corporation_id) {
      return {
        name: (await getCorporationsCorporationId(side.corporation_id)).data
          .name,
        image: eveImage.corporation(side.corporation_id),
      };
    }
  } catch {
    // Fall through — an unnamed side still yields a usable card.
  }
  return {};
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ warId: string }>;
}): Promise<Metadata> {
  const { warId } = await params;
  const id = Number(warId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  const fallback = pageMetadata({
    title: `War #${id}`,
    description: `EVE Online war #${id} — war details, mutual war status, and open kills.`,
    path: `/war/${id}`,
    badge: "War",
  });

  try {
    const war = (await getWarsWarId(id)).data;
    const [aggressor, defender] = await Promise.all([
      describeSide(war.aggressor),
      describeSide(war.defender),
    ]);
    if (!aggressor.name || !defender.name) return fallback;

    const declared = war.declared.slice(0, 10);
    const kills = war.aggressor.ships_killed + war.defender.ships_killed;

    return pageMetadata({
      title: `${aggressor.name} vs ${defender.name}`,
      description: `EVE Online war #${id}: ${aggressor.name} declared war on ${defender.name} on ${declared}${
        war.finished ? `, ending ${war.finished.slice(0, 10)}` : ""
      }. ${kills} ships destroyed so far.`,
      path: `/war/${id}`,
      badge: war.finished ? "Finished War" : "Active War",
      // The aggressor's emblem: the side that started it is the one a reader
      // is usually looking for.
      image: aggressor.image,
      facts: [
        { label: "Declared", value: declared },
        { label: "Ships Killed", value: kills.toLocaleString("en-US") },
        { label: "Mutual", value: war.mutual ? "Yes" : "No" },
      ],
    });
  } catch {
    return fallback;
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ warId: string }>;
}>) {
  const { warId } = await params;
  if (parsePositiveEntityId(warId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ warId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
