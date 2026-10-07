import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { isNpcCorporationId } from "@jitaspace/esi-metadata";

import type {
  CorporationProfile,
  CorporationStation,
  NamedRef,
  NpcCorporationDetails,
} from "./types";
import { prisma } from "~/lib/db";
import { readWarRecord } from "~/lib/readWarRecord";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
import { corporationCacheTag } from "./ids";

const ref = (
  id: number | null | undefined,
  name: string | null | undefined,
): NamedRef | null => (id == null ? null : { id, name: name ?? null });

const byName = <T extends { name: string | null }>(a: T, b: T) =>
  (a.name ?? "").localeCompare(b.name ?? "");

type CorporationRow = NonNullable<Awaited<ReturnType<typeof findCorporation>>>;

function findCorporation(corporationId: number) {
  return prisma.corporation.findUnique({
    select: {
      corporationId: true,
      name: true,
      ticker: true,
      description: true,
      url: true,
      memberCount: true,
      taxRate: true,
      dateFounded: true,
      ceoId: true,
      ceo: { select: { name: true } },
      creatorId: true,
      creator: { select: { name: true } },
      allianceId: true,
      alliance: { select: { name: true } },
      enlistedFactionId: true,
      enlistedFaction: { select: { name: true } },
      homeStationId: true,
      homeStation: { select: { name: true } },
      shares: true,
      warEligible: true,
      // SDE-only columns, set for NPC corporations.
      factionId: true,
      faction: { select: { name: true } },
      size: true,
      sizeFactor: true,
      extent: true,
      memberLimit: true,
      minSecurity: true,
      minimumJoinStanding: true,
      initialPrice: true,
      hasPlayerPersonnelManager: true,
      sendCharTerminationMessage: true,
      isUnique: true,
      isDeletedByCcp: true,
      solarSystemId: true,
      raceId: true,
      mainActivityId: true,
      secondaryActivityId: true,
      enemyId: true,
      friendId: true,
    },
    where: { corporationId },
  });
}

/**
 * The NPC-only relations, read separately so player corporations, which have
 * none, do not pay a query for each.
 */
function findNpcRelations(corporationId: number) {
  return prisma.corporation.findUniqueOrThrow({
    select: {
      allowedRaces: { select: { raceId: true }, where: { isDeleted: false } },
      npcDivisions: {
        select: {
          npcCorporationDivisionId: true,
          size: true,
          leaderId: true,
        },
        where: { isDeleted: false },
      },
      investors: {
        select: {
          investorCorporationId: true,
          shares: true,
          investor: { select: { name: true } },
        },
        where: { isDeleted: false },
      },
      investedIn: {
        select: {
          corporationId: true,
          shares: true,
          corporation: { select: { name: true } },
        },
        where: { isDeleted: false },
      },
      exchangeRates: {
        select: {
          otherCorporationId: true,
          rate: true,
          other: { select: { name: true } },
        },
        where: { isDeleted: false },
      },
    },
    where: { corporationId },
  });
}

/** The SDE's facts about an NPC corporation, with its references named. */
async function readNpcDetails(
  row: CorporationRow,
): Promise<NpcCorporationDetails> {
  const corporation = {
    ...row,
    ...(await findNpcRelations(row.corporationId)),
  };
  const raceIds = [
    ...new Set([
      ...corporation.allowedRaces.map((race) => race.raceId),
      ...(corporation.raceId == null ? [] : [corporation.raceId]),
    ]),
  ];
  const activityIds = [
    corporation.mainActivityId,
    corporation.secondaryActivityId,
  ].filter((id): id is number => id != null);
  const relatedIds = [corporation.enemyId, corporation.friendId].filter(
    (id): id is number => id != null,
  );
  const divisionIds = corporation.npcDivisions.map(
    (division) => division.npcCorporationDivisionId,
  );

  const [headquarters, races, activities, related, divisions, lpOffers] =
    await Promise.all([
      corporation.solarSystemId == null
        ? null
        : prisma.solarSystem.findUnique({
            select: {
              solarSystemId: true,
              name: true,
              securityStatus: true,
              constellation: {
                select: { regionId: true, region: { select: { name: true } } },
              },
            },
            where: { solarSystemId: corporation.solarSystemId },
          }),
      prisma.race.findMany({
        select: { raceId: true, name: true },
        where: { raceId: { in: raceIds } },
      }),
      prisma.corporationActivity.findMany({
        select: { corporationActivityId: true, name: true },
        where: { corporationActivityId: { in: activityIds } },
      }),
      prisma.corporation.findMany({
        select: { corporationId: true, name: true },
        where: { corporationId: { in: relatedIds } },
      }),
      prisma.npcCorporationDivision.findMany({
        select: {
          npcCorporationDivisionId: true,
          name: true,
          displayName: true,
        },
        where: { npcCorporationDivisionId: { in: divisionIds } },
      }),
      prisma.loyaltyStoreOffer.count({
        where: { corporationId: corporation.corporationId, isDeleted: false },
      }),
    ]);

  const raceNames = new Map(races.map((race) => [race.raceId, race.name]));
  const activityNames = new Map(
    activities.map((activity) => [
      activity.corporationActivityId,
      activity.name,
    ]),
  );
  const relatedNames = new Map(
    related.map((other) => [other.corporationId, other.name]),
  );
  const divisionNames = new Map(
    divisions.map((division) => [
      division.npcCorporationDivisionId,
      division.displayName ?? division.name,
    ]),
  );
  const activityName = (id: number | null) =>
    id == null ? null : (activityNames.get(id) ?? null);

  return {
    faction: ref(corporation.factionId, corporation.faction?.name),
    size: corporation.size,
    sizeFactor: corporation.sizeFactor,
    extent: corporation.extent,
    memberLimit: corporation.memberLimit,
    minSecurity: corporation.minSecurity,
    minimumJoinStanding: corporation.minimumJoinStanding,
    initialPrice: corporation.initialPrice,
    hasPlayerPersonnelManager: corporation.hasPlayerPersonnelManager,
    sendCharTerminationMessage: corporation.sendCharTerminationMessage,
    isUnique: corporation.isUnique,
    isDeletedByCcp: corporation.isDeletedByCcp,
    headquarters: headquarters && {
      solarSystemId: headquarters.solarSystemId,
      name: headquarters.name,
      securityStatus: headquarters.securityStatus.toNumber(),
      regionId: headquarters.constellation.regionId,
      regionName: headquarters.constellation.region?.name ?? null,
    },
    race:
      corporation.raceId == null
        ? null
        : ref(corporation.raceId, raceNames.get(corporation.raceId)),
    allowedRaces: corporation.allowedRaces
      .map((race) => ref(race.raceId, raceNames.get(race.raceId)))
      .filter((race): race is NamedRef => race !== null)
      .sort(byName),
    mainActivity: activityName(corporation.mainActivityId),
    secondaryActivity: activityName(corporation.secondaryActivityId),
    enemy:
      corporation.enemyId == null
        ? null
        : ref(corporation.enemyId, relatedNames.get(corporation.enemyId)),
    friend:
      corporation.friendId == null
        ? null
        : ref(corporation.friendId, relatedNames.get(corporation.friendId)),
    divisions: corporation.npcDivisions
      .map((division) => ({
        divisionId: division.npcCorporationDivisionId,
        name:
          divisionNames.get(division.npcCorporationDivisionId) ??
          `Division ${division.npcCorporationDivisionId}`,
        size: division.size,
        leaderId: division.leaderId,
      }))
      .sort(byName),
    investors: corporation.investors
      .map((holding) => ({
        corporationId: holding.investorCorporationId,
        name: holding.investor.name,
        shares: holding.shares,
      }))
      .sort((a, b) => b.shares - a.shares),
    investedIn: corporation.investedIn
      .map((holding) => ({
        corporationId: holding.corporationId,
        name: holding.corporation.name,
        shares: holding.shares,
      }))
      .sort((a, b) => b.shares - a.shares),
    exchangeRates: corporation.exchangeRates
      .map((rate) => ({
        corporationId: rate.otherCorporationId,
        name: rate.other.name,
        rate: rate.rate,
      }))
      .sort(byName),
    lpOffers,
  };
}

async function readStations(
  corporationId: number,
): Promise<CorporationStation[]> {
  const stations = await prisma.station.findMany({
    select: {
      stationId: true,
      name: true,
      typeId: true,
      reprocessingEfficiency: true,
      officeRentalCost: true,
      solarSystem: {
        select: {
          solarSystemId: true,
          name: true,
          securityStatus: true,
          constellation: {
            select: { regionId: true, region: { select: { name: true } } },
          },
        },
      },
    },
    where: { ownerId: corporationId, isDeleted: false },
  });
  return stations
    .map((station) => ({
      stationId: station.stationId,
      name: station.name,
      typeId: station.typeId,
      solarSystemId: station.solarSystem?.solarSystemId ?? null,
      solarSystemName: station.solarSystem?.name ?? null,
      securityStatus: station.solarSystem?.securityStatus.toNumber() ?? null,
      regionId: station.solarSystem?.constellation.regionId ?? null,
      regionName: station.solarSystem?.constellation.region?.name ?? null,
      reprocessingEfficiency: station.reprocessingEfficiency,
      officeRentalCost: station.officeRentalCost,
    }))
    .sort(byName);
}

async function readAgents(corporationId: number) {
  const [agents, agentTypes, agentDivisions] = await Promise.all([
    prisma.agent.findMany({
      select: {
        characterId: true,
        Character: { select: { name: true } },
        agentTypeId: true,
        agentDivisionId: true,
        isLocator: true,
        level: true,
        stationId: true,
      },
      where: { isDeleted: false, Character: { corporationId } },
    }),
    prisma.agentType.findMany({ select: { agentTypeId: true, name: true } }),
    prisma.npcCorporationDivision.findMany({
      select: { npcCorporationDivisionId: true, name: true },
    }),
  ]);
  return {
    agents: agents
      .map((agent) => ({
        characterId: agent.characterId,
        name: agent.Character.name,
        corporationId,
        agentTypeId: agent.agentTypeId,
        agentDivisionId: agent.agentDivisionId,
        isLocator: agent.isLocator,
        level: agent.level,
        stationId: agent.stationId,
      }))
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)),
    // The type and division names the agents table labels rows with; only
    // those this corporation's agents use.
    agentTypes: agentTypes.filter((type) =>
      agents.some((agent) => agent.agentTypeId === type.agentTypeId),
    ),
    agentDivisions: agentDivisions.filter((division) =>
      agents.some(
        (agent) => agent.agentDivisionId === division.npcCorporationDivisionId,
      ),
    ),
  };
}

async function readTrades(corporationId: number) {
  const trades = await prisma.npcCorporationTrade.findMany({
    select: { typeId: true, value: true },
    where: { corporationId, isDeleted: false },
  });
  const types = await prisma.type.findMany({
    select: { typeId: true, name: true },
    where: { typeId: { in: trades.map((trade) => trade.typeId) } },
  });
  const typeNames = new Map(types.map((type) => [type.typeId, type.name]));
  return trades
    .map((trade) => ({
      typeId: trade.typeId,
      typeName: typeNames.get(trade.typeId) ?? `Type ${trade.typeId}`,
      value: trade.value,
    }))
    .sort((a, b) => a.typeName.localeCompare(b.typeName));
}

/**
 * Everything the corporation page shows from our database, or `null` when we
 * have not stored the corporation.
 *
 * Cached per corporation for hours. It reads SDE tables (the NPC details,
 * stations, agents) and ESI-scraped ones (the corporation row, wars), so it
 * keeps its own `cacheLife` and adds the SDE tag, which the next ingest
 * refreshes. See CLAUDE.md → "SDE reads are cached until the next ingest".
 *
 * Nothing here catches: a database failure throws, and the uncached caller
 * degrades to the ESI-only page, so a blip is never what gets cached.
 */
export async function readCorporationProfile(
  corporationId: number,
): Promise<CorporationProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(SDE_CACHE_TAG, corporationCacheTag(corporationId));

  const corporation = await findCorporation(corporationId);
  if (corporation === null) return null;

  const now = Date.now();
  const [npc, stations, agents, trades, warRecord] = await Promise.all([
    isNpcCorporationId(corporationId) ? readNpcDetails(corporation) : null,
    isNpcCorporationId(corporationId) ? readStations(corporationId) : [],
    isNpcCorporationId(corporationId)
      ? readAgents(corporationId)
      : { agents: [], agentTypes: [], agentDivisions: [] },
    isNpcCorporationId(corporationId) ? readTrades(corporationId) : [],
    // NPC corporations do not go to war; skip the queries.
    isNpcCorporationId(corporationId)
      ? null
      : readWarRecord({ kind: "corporation", id: corporationId }, now),
  ]);

  return {
    corporationId: corporation.corporationId,
    name: corporation.name,
    ticker: corporation.ticker,
    description: corporation.description,
    url: corporation.url,
    memberCount: corporation.memberCount,
    taxRate: corporation.taxRate,
    dateFounded: corporation.dateFounded?.toISOString() ?? null,
    ceo: ref(corporation.ceoId, corporation.ceo?.name),
    creator: ref(corporation.creatorId, corporation.creator?.name),
    alliance: ref(corporation.allianceId, corporation.alliance?.name),
    enlistedFaction: ref(
      corporation.enlistedFactionId,
      corporation.enlistedFaction?.name,
    ),
    homeStation: ref(corporation.homeStationId, corporation.homeStation?.name),
    shares: corporation.shares?.toString() ?? null,
    warEligible: corporation.warEligible,
    npc,
    stations,
    ...agents,
    trades,
    wars: warRecord?.wars ?? [],
    warSummary: warRecord?.summary ?? {
      total: 0,
      asAggressor: 0,
      asDefender: 0,
      asAlly: 0,
      ongoing: 0,
      shipsKilled: 0,
      iskDestroyed: 0,
      shipsLost: 0,
      iskLost: 0,
    },
    readAt: new Date(now).toISOString(),
  };
}

/** What the page gets from {@link loadCorporationProfile}. */
export type CorporationProfileResult =
  | { ok: true; profile: CorporationProfile | null }
  | { ok: false };

/**
 * The page renders from ESI without this half, so a database failure degrades
 * to the ESI-only page. `ok: false` lets the caller keep that degraded render
 * out of the ISR cache. `cache()` gives `generateMetadata` and the page one
 * attempt per request.
 */
export const loadCorporationProfile = cache(
  async (corporationId: number): Promise<CorporationProfileResult> => {
    try {
      return { ok: true, profile: await readCorporationProfile(corporationId) };
    } catch {
      return { ok: false };
    }
  },
);
