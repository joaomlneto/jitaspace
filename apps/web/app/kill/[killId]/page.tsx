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
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

interface KillmailParty {
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
}

/**
 * A short "who" for a victim or attacker: a character with their corporation,
 * or — for a structure, NPC, or drone — whichever of alliance/corporation/
 * faction the killmail carries (alliance preferred, the same priority
 * `war/[warId]` uses to label a side). Any ESI/DB failure just omits the
 * clause; a partial card beats none.
 */
async function describeKillmailParty(
  party: KillmailParty,
): Promise<string | undefined> {
  try {
    if (party.character_id) {
      const character = (await getCharactersDetail(party.character_id)).data;
      const corporation = await getCorporationsCorporationId(
        character.corporation_id,
      )
        .then((res) => res.data.name)
        .catch(() => undefined);
      return corporation
        ? `${character.name} (${corporation})`
        : character.name;
    }
    if (party.alliance_id) {
      return (await getAlliancesAllianceId(party.alliance_id)).data.name;
    }
    if (party.corporation_id) {
      return (await getCorporationsCorporationId(party.corporation_id)).data
        .name;
    }
    if (party.faction_id) {
      return (
        await prisma.faction.findUnique({
          select: { name: true },
          where: { factionId: party.faction_id },
        })
      )?.name;
    }
  } catch {
    // Fall through — see doc comment above.
  }
  return undefined;
}

/** ISK abbreviated the way the client's `ISKAmount` does, for plain text. */
function formatIskShort(amount: number): string {
  const tiers = [
    { value: 1e12, symbol: "T" },
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "K" },
  ];
  const tier = tiers.find((t) => Math.abs(amount) >= t.value);
  if (!tier) return amount.toFixed(0);
  return `${(amount / tier.value).toFixed(1).replace(/\.0$/, "")}${tier.symbol}`;
}

interface ZkbLookup {
  hash: string;
  totalValue?: number;
}

/**
 * zKillboard is the only way to recover a killmail's ESI hash from just its
 * numeric ID, and the only rate-limited third party this page touches — so the
 * lookup is cached forever (a killmail's hash and reported value never change)
 * rather than repeated on every crawler unfurl of a popular kill. Throws on any
 * failure so a transient zKillboard outage never gets cached as "no such kill".
 */
async function resolveZkbLookup(killId: number): Promise<ZkbLookup> {
  "use cache";
  cacheLife("max");

  const res = await fetch(`https://zkillboard.com/api/killID/${killId}/`, {
    headers: { "User-Agent": "JitaSpace/1.0 (+https://jita.space)" },
  });
  if (!res.ok) throw new Error(`zKillboard responded ${res.status}`);
  const [entry] = (await res.json()) as {
    zkb?: { hash?: string; totalValue?: number };
  }[];
  if (!entry?.zkb?.hash) {
    throw new Error("zKillboard has no record of this killmail");
  }
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
    description: `EVE Online killmail #${id} — victim, ship, attackers, and dropped loot.`,
    path: `/kill/${id}`,
    badge: "Killmail",
  });

  // ESI needs the killmail hash, which isn't in the path. A shared link may
  // already carry it (`?hash=`); otherwise recover it from zKillboard, whose
  // lookup by ID alone is what `resolveZkbLookup` caches forever.
  const hashParam = (await searchParams)?.hash;
  let hash = typeof hashParam === "string" && hashParam ? hashParam : undefined;
  let totalValue: number | undefined;

  if (!hash) {
    try {
      const zkb = await resolveZkbLookup(id);
      hash = zkb.hash;
      totalValue = zkb.totalValue;
    } catch {
      return fallback;
    }
  }

  try {
    const killmail = (await getKillmailsKillmailIdKillmailHash(hash, id)).data;
    const { victim } = killmail;
    const finalBlow = killmail.attackers.find((a) => a.final_blow);
    const attackerCount = killmail.attackers.length;

    // Every lookup here degrades independently on failure (a database blip
    // shouldn't discard the victim/attacker/value data other entries already
    // resolved) — matching describeKillmailParty's own "a partial card beats
    // none" philosophy, rather than letting Promise.all's fail-fast semantics
    // drop the whole card to the generic fallback below.
    const [ship, system, shipImage, victimLabel, finalBlowLabel] =
      await Promise.all([
        prisma.type
          .findUnique({
            select: { name: true },
            where: { typeId: victim.ship_type_id },
          })
          .catch(() => null),
        prisma.solarSystem
          .findUnique({
            select: { name: true },
            where: { solarSystemId: killmail.solar_system_id },
          })
          .catch(() => null),
        resolveTypeImage(victim.ship_type_id),
        describeKillmailParty(victim),
        finalBlow ? describeKillmailParty(finalBlow) : undefined,
      ]);

    const shipName = ship?.name;
    const systemName = system?.name;

    const description = [
      `${victimLabel ?? "A capsuleer"} lost ${
        shipName ? `their ${shipName}` : "their ship"
      }${systemName ? ` in ${systemName}` : ""} to ${attackerCount} attacker${
        attackerCount === 1 ? "" : "s"
      }.`,
      finalBlowLabel ? `Final blow by ${finalBlowLabel}.` : "",
      totalValue ? `Total value: ${formatIskShort(totalValue)} ISK.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return pageMetadata({
      title: shipName ? `${shipName} destroyed` : `Killmail #${id}`,
      description,
      path: `/kill/${id}`,
      badge: "Killmail",
      rawImage: shipImage,
      facts: [
        ...(systemName ? [{ label: "System", value: systemName }] : []),
        { label: "Attackers", value: String(attackerCount) },
        ...(totalValue
          ? [{ label: "Value", value: `${formatIskShort(totalValue)} ISK` }]
          : []),
      ],
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
