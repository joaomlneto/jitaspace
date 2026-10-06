import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NuqsAdapter } from "nuqs/adapters/react";

import type { EsiCharacterCard } from "./types";
import { readEsiAlliance } from "~/app/alliance/[allianceId]/esi";
import { readEsiCorporation } from "~/app/corporation/[corporationId]/esi";
import { PageSkeleton } from "~/components/PageSkeleton";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { loadCharacterRecord } from "./data";
import { readEsiCharacter } from "./esi";
import PageClient from "./page.client";

/** A name from a cached ESI read; null if ESI has none, undefined if it failed. */
async function readName(
  read: () => Promise<{ name: string } | null>,
): Promise<string | null | undefined> {
  try {
    return (await read())?.name ?? null;
  } catch {
    return undefined;
  }
}

/**
 * Names the card's corporation and alliance, each from its own cached read.
 * A lookup ESI cannot answer leaves that name for the browser to fill in, and
 * reports `failed` so the page can keep the render out of the cache.
 */
async function nameAffiliations(
  card: EsiCharacterCard,
): Promise<{ card: EsiCharacterCard; failed: boolean }> {
  const { corporation, alliance } = card;
  const [corporationName, allianceName] = await Promise.all([
    readName(() => readEsiCorporation(corporation.id)),
    alliance ? readName(() => readEsiAlliance(alliance.id)) : null,
  ]);
  return {
    card: {
      ...card,
      corporation: { ...corporation, name: corporationName ?? null },
      alliance: alliance && { ...alliance, name: allianceName ?? null },
    },
    failed: corporationName === undefined || allianceName === undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ characterId: string }>;
}): Promise<Metadata> {
  const { characterId } = await params;
  const id = parsePositiveEntityId(characterId);
  if (id === null) return {};
  try {
    const sheet = await readEsiCharacter(id);
    if (sheet === null) return {};
    const { card: character } = await nameAffiliations(sheet);

    const corporation = character.corporation.name;
    const alliance = character.alliance?.name;
    const flyingWith = corporation ? ` flying with ${corporation}` : "";
    const inAlliance = alliance ? ` (${alliance})` : "";

    return pageMetadata({
      title: character.name,
      description: `${character.name} is an EVE Online capsuleer${flyingWith}${inAlliance}. View their corporation history, affiliations, killboard and public record.`,
      path: `/character/${id}`,
      badge: "Character",
      image: eveImage.character(id),
      facts: [
        ...(corporation ? [{ label: "Corporation", value: corporation }] : []),
        ...(alliance ? [{ label: "Alliance", value: alliance }] : []),
      ],
    });
  } catch {
    return {};
  }
}

// ISR: each character's page is cached whole and revalidated on its ESI read's
// `cacheLife("hours")`. Without `generateStaticParams` (plus
// `experimental.partialFallbacks`, next.config.mjs) Next 16.2 would serve an
// unlisted character from the fallback shell and re-render it on every
// request. Cache Components rejects an empty list, so this lists one id
// `parsePositiveEntityId` refuses: it prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ characterId: "0" }];
}

/**
 * ESI's card, `null` when ESI says the character does not exist, or
 * `undefined` when ESI could not answer. An unanswered read keeps the render
 * out of the cache, so an ESI outage is never cached.
 */
async function loadEsiCharacter(
  characterId: number,
): Promise<EsiCharacterCard | null | undefined> {
  try {
    return await readEsiCharacter(characterId);
  } catch {
    await connection();
    return undefined;
  }
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ characterId: string }> }>) {
  const { characterId } = await params;
  const id = parsePositiveEntityId(characterId);
  if (id === null) notFound();

  const [sheet, result] = await Promise.all([
    loadEsiCharacter(id),
    loadCharacterRecord(id),
  ]);
  let esi = sheet;
  if (sheet) {
    const named = await nameAffiliations(sheet);
    esi = named.card;
    // A name ESI could not give: render it in the browser, uncached.
    if (named.failed) await connection();
  }
  // The database failed: render without its half for this request, but keep
  // it out of the ISR cache, so the next request tries again.
  if (!result.ok) await connection();
  const record = result.ok ? result.record : null;
  // Neither ESI nor our database knows it: there is no such character, and an
  // empty page would be a soft 404 cached for every id requested.
  if (esi === null && result.ok && record === null) notFound();

  // nuqs's React adapter, not the app-wide Next one, whose `useSearchParams()`
  // would leave only the skeleton in the cached HTML.
  return (
    <NuqsAdapter>
      <PageClient characterId={id} esi={esi ?? null} record={record} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ characterId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
