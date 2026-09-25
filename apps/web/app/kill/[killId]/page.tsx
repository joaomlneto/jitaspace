import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import {
  getAlliancesAllianceId,
  getCharactersDetail,
  getCorporationsCorporationId,
  getKillmailsKillmailIdKillmailHash,
} from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { eveImage, pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

interface KillmailParty {
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
}

interface PartyLabel {
  /** Character name or, for a structure/NPC/drone, its owning entity. */
  name: string;
  /** Corporation the character flew for at the time of the kill. */
  corporation?: string;
}

/**
 * Who a victim or attacker is, the way killboards name them: a character with
 * the corporation recorded *on the killmail* (not whichever one they have joined
 * since), or — for a structure, NPC, or drone — the owning corporation, then
 * alliance, then faction. Any ESI/DB failure just omits the party; a partial
 * card beats none.
 */
async function describeKillmailParty(
  party: KillmailParty,
): Promise<PartyLabel | undefined> {
  const corporationName = (id: number) =>
    getCorporationsCorporationId(id).then((res) => res.data.name);
  try {
    if (party.character_id) {
      const [character, corporation] = await Promise.all([
        getCharactersDetail(party.character_id).then((res) => res.data.name),
        party.corporation_id
          ? corporationName(party.corporation_id).catch(() => undefined)
          : undefined,
      ]);
      return { name: character, corporation };
    }
    if (party.corporation_id) {
      return { name: await corporationName(party.corporation_id) };
    }
    if (party.alliance_id) {
      return {
        name: (await getAlliancesAllianceId(party.alliance_id)).data.name,
      };
    }
    if (party.faction_id) {
      const faction = await prisma.faction.findUnique({
        select: { name: true },
        where: { factionId: party.faction_id },
      });
      return faction ? { name: faction.name } : undefined;
    }
  } catch {
    // Fall through — see doc comment above.
  }
  return undefined;
}

function formatParty({ name, corporation }: PartyLabel): string {
  return corporation ? `${name} (${corporation})` : name;
}

/** "a Tornado", "an Ishtar". */
function withIndefiniteArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;
}

const ISK_TIERS = [
  { value: 1e12, symbol: "T" },
  { value: 1e9, symbol: "B" },
  { value: 1e6, symbol: "M" },
  { value: 1e3, symbol: "K" },
  { value: 1, symbol: "" },
];

/**
 * ISK abbreviated the way the client's `ISKAmount` does, for plain text —
 * except that rounding which carries into the next tier moves up to it
 * (999.96M reads "1B", not "1000M").
 */
function formatIskShort(amount: number): string {
  const digits = (tier: { value: number }) =>
    tier.value === 1
      ? Math.round(amount).toFixed(0)
      : (amount / tier.value).toFixed(1).replace(/\.0$/, "");
  const found = ISK_TIERS.findIndex((t) => Math.abs(amount) >= t.value);
  // Below 1 ISK (or NaN): the base tier.
  const i = found < 0 ? ISK_TIERS.length - 1 : found;
  const current = ISK_TIERS[i] ?? { value: 1, symbol: "" };
  const larger = ISK_TIERS[i - 1];
  const tier =
    larger && Math.abs(Number(digits(current))) >= 1000 ? larger : current;
  return `${digits(tier)}${tier.symbol}`;
}

interface ZkbLookup {
  hash: string;
  totalValue?: number;
}

/**
 * zKillboard is the only way to recover a killmail's ESI hash from just its
 * numeric ID, and the only rate-limited third party this page touches — so its
 * answers are cached rather than repeated on every crawler unfurl:
 *
 * - a hit with `cacheLife("max")` (revalidated at most monthly): a killmail's
 *   hash never changes and its appraisal barely does;
 * - "no such killmail" with `cacheLife("minutes")`, so walking unknown IDs
 *   can't turn every request into a zKillboard request, while a kill shared
 *   the moment it happens (before zKillboard has ingested it) still picks up
 *   its card within a minute.
 *
 * A failure — non-2xx, including a 429, or a timeout — throws, so an outage is
 * never what gets cached.
 */
async function resolveZkbLookup(killId: number): Promise<ZkbLookup | null> {
  "use cache";

  const res = await fetch(`https://zkillboard.com/api/killID/${killId}/`, {
    headers: { "User-Agent": "JitaSpace/1.0 (+https://jita.space)" },
    // Crawlers give up on a slow unfurl; better a plain card than none.
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`zKillboard responded ${res.status}`);
  const [entry] = (await res.json()) as {
    zkb?: { hash?: string; totalValue?: number };
  }[];
  if (!entry?.zkb?.hash) {
    cacheLife("minutes");
    return null;
  }
  cacheLife("max");
  return { hash: entry.zkb.hash, totalValue: entry.zkb.totalValue };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ killId: string }>;
  // Next always passes this to a page's generateMetadata; optional here so the
  // function stays callable with params alone.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { killId } = await params;
  const id = Number(killId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  const fallback = pageMetadata({
    title: `Killmail #${id}`,
    description: `EVE Online killmail #${id}.`,
    path: `/kill/${id}`,
    badge: "Killmail",
    plainSocialTitle: true,
  });

  // ESI needs the killmail hash, which isn't in the path. zKillboard's lookup
  // by ID supplies it along with the kill's value — asked even when the link
  // already carries `?hash=` (EVE-mail kill reports produce these), so both
  // link shapes unfurl with the value. The supplied hash is the fallback for
  // when zKillboard doesn't answer.
  const hashParam = (await searchParams)?.hash;
  const zkb = await resolveZkbLookup(id).catch(() => null);
  const hash =
    zkb?.hash ??
    (typeof hashParam === "string" && hashParam ? hashParam : undefined);
  if (!hash) return fallback;
  const totalValue = zkb?.totalValue;

  try {
    const killmail = (await getKillmailsKillmailIdKillmailHash(hash, id)).data;
    const { victim } = killmail;
    const finalBlow = killmail.attackers.find((a) => a.final_blow);
    const attackerCount = killmail.attackers.length;

    const typeName = (typeId: number | undefined) =>
      typeId === undefined
        ? undefined
        : prisma.type
            .findUnique({ select: { name: true }, where: { typeId } })
            .then((type) => type?.name)
            .catch(() => undefined);

    // Every lookup here degrades independently on failure (a database blip
    // shouldn't discard the victim/attacker/value data other entries already
    // resolved) — matching describeKillmailParty's own "a partial card beats
    // none" philosophy, rather than letting Promise.all's fail-fast semantics
    // drop the whole card to the generic fallback above.
    const [
      shipName,
      finalBlowShipName,
      system,
      shipImage,
      victimLabel,
      fbLabel,
    ] = await Promise.all([
      typeName(victim.ship_type_id),
      typeName(finalBlow?.ship_type_id),
      prisma.solarSystem
        .findUnique({
          select: {
            name: true,
            constellation: { select: { region: { select: { name: true } } } },
          },
          where: { solarSystemId: killmail.solar_system_id },
        })
        .catch(() => null),
      resolveTypeImage(victim.ship_type_id),
      describeKillmailParty(victim),
      finalBlow ? describeKillmailParty(finalBlow) : undefined,
    ]);

    const value =
      // zKillboard reports 0 for an unappraised kill — say nothing, not "0 ISK".
      totalValue && Number.isFinite(totalValue) && totalValue > 0
        ? `${formatIskShort(totalValue)} ISK`
        : undefined;
    const regionName = system?.constellation.region?.name;
    const where = system
      ? ` in ${system.name}${regionName ? ` (${regionName})` : ""}`
      : "";
    const fbShip = finalBlowShipName
      ? ` in ${withIndefiniteArticle(finalBlowShipName)}`
      : "";
    const fbClause = fbLabel ? `${formatParty(fbLabel)}${fbShip}` : undefined;

    // Killboard phrasing (zKillboard, EVE-Kill): who lost what, where, for how
    // much; then who got the final blow in what. Nothing else.
    const description = [
      `${victimLabel ? formatParty(victimLabel) : "Unknown"} lost their ${
        shipName ?? "ship"
      }${where}${value ? ` worth ${value}` : ""}.`,
      attackerCount === 1
        ? `Solo kill${fbClause ? ` by ${fbClause}` : ""}.`
        : `${attackerCount} attackers${
            fbClause ? `, final blow by ${fbClause}` : ""
          }.`,
    ].join(" ");

    return pageMetadata({
      // "Rifter | Alduin Vok | 45.6M ISK" — zKillboard/EVE-Kill's headline.
      title:
        [shipName, victimLabel?.name, value].filter(Boolean).join(" | ") ||
        `Killmail #${id}`,
      description,
      path: `/kill/${id}`,
      badge: "Killmail",
      // Never the generated text card: if the CDN lookup failed, point at the
      // render anyway (every hull has one) rather than paint the description
      // onto a 1200x630 card.
      rawImage: shipImage ?? eveImage.type(victim.ship_type_id, "render"),
      plainSocialTitle: true,
    });
  } catch {
    return fallback;
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  const { killId } = await params;
  if (parsePositiveEntityId(killId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
