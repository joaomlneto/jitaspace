import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";

import type { Prisma } from "@jitaspace/db";

import type {
  AllianceProfile,
  AllianceWar,
  AllianceWarRole,
  AllianceWarStatus,
  AllianceWarSummary,
} from "./types";
import { allianceCacheTag } from "~/lib/alliancesCache";
import { prisma } from "~/lib/db";

/**
 * How many wars the page lists. Mercenary alliances have declared thousands;
 * the summary still counts all of them.
 */
export const ALLIANCE_WAR_LIST_LIMIT = 500;

const warSelect = {
  warId: true,
  aggressorAllianceId: true,
  aggressorCorporationId: true,
  defenderAllianceId: true,
  defenderCorporationId: true,
  aggressorShipsKilled: true,
  aggressorIskDestroyed: true,
  defenderShipsKilled: true,
  defenderIskDestroyed: true,
  declaredDate: true,
  startedDate: true,
  finishedDate: true,
  retractedDate: true,
  isMutual: true,
  isOpenForAllies: true,
  _count: { select: { allianceAllies: true, corporationAllies: true } },
} satisfies Prisma.WarSelect;

type RawWar = Prisma.WarGetPayload<{ select: typeof warSelect }>;

export function deriveWarStatus(
  war: Pick<RawWar, "startedDate" | "finishedDate" | "retractedDate">,
  now: number,
): AllianceWarStatus {
  const finished = war.finishedDate?.getTime();
  if (finished !== undefined && finished <= now) return "finished";
  const started = war.startedDate?.getTime();
  if (started === undefined || started > now) return "pending";
  const retracted = war.retractedDate?.getTime();
  if (retracted !== undefined && retracted <= now) return "retracting";
  return "active";
}

function toAllianceWar(
  war: RawWar,
  allianceId: number,
  now: number,
): AllianceWar {
  let role: AllianceWarRole = "ally";
  if (war.aggressorAllianceId === allianceId) role = "aggressor";
  else if (war.defenderAllianceId === allianceId) role = "defender";
  return {
    warId: war.warId,
    role,
    status: deriveWarStatus(war, now),
    aggressorAllianceId: war.aggressorAllianceId,
    aggressorCorporationId: war.aggressorCorporationId,
    defenderAllianceId: war.defenderAllianceId,
    defenderCorporationId: war.defenderCorporationId,
    aggressorShipsKilled: war.aggressorShipsKilled,
    aggressorIskDestroyed: war.aggressorIskDestroyed,
    defenderShipsKilled: war.defenderShipsKilled,
    defenderIskDestroyed: war.defenderIskDestroyed,
    declaredDate: war.declaredDate.toISOString(),
    startedDate: war.startedDate?.toISOString() ?? null,
    finishedDate: war.finishedDate?.toISOString() ?? null,
    retractedDate: war.retractedDate?.toISOString() ?? null,
    isMutual: war.isMutual,
    isOpenForAllies: war.isOpenForAllies,
    allyCount: war._count.allianceAllies + war._count.corporationAllies,
  };
}

/**
 * Everything the alliance page shows from our database, or `null` when the
 * hourly job has not stored the alliance (yet).
 *
 * Cached per alliance for hours, tagged so the job's eviction route expires it
 * when that alliance changes. Deliberately not tagged with the `/alliances`
 * list's tag: the job marks that stale on almost every run, which would make
 * every alliance's ISR page regenerate hourly, not just the ones that changed.
 * Wars are not on the job's path; `cacheLife("hours")` bounds them.
 *
 * Nothing here catches: a database failure throws, and the uncached caller in
 * `page.tsx` degrades to the ESI-only page, so a blip is never what gets
 * cached. See CLAUDE.md → "Never catch a database error inside a `"use cache"`
 * scope".
 */
export async function readAllianceProfile(
  allianceId: number,
): Promise<AllianceProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(allianceCacheTag(allianceId));

  const alliance = await prisma.alliance.findUnique({
    select: {
      allianceId: true,
      name: true,
      ticker: true,
      dateFounded: true,
      isDeleted: true,
      creatorCorporationId: true,
      creatorCorporation: { select: { name: true } },
      executorCorporationId: true,
      executorCorporation: { select: { name: true } },
      factionId: true,
      faction: { select: { name: true } },
    },
    where: { allianceId },
  });
  if (alliance === null) return null;

  const now = Date.now();
  const nowDate = new Date(now);
  const asAggressor = { aggressorAllianceId: allianceId };
  const asDefender = { defenderAllianceId: allianceId };
  const asAlly = { allianceAllies: { some: { allianceId } } };
  const unfinished = {
    OR: [{ finishedDate: null }, { finishedDate: { gt: nowDate } }],
  };

  const [
    corporations,
    sovereignty,
    wars,
    aggressorTotals,
    defenderTotals,
    allyCount,
    ongoing,
  ] = await Promise.all([
    prisma.corporation.findMany({
      select: {
        corporationId: true,
        name: true,
        ticker: true,
        memberCount: true,
        ceoId: true,
        ceo: { select: { name: true } },
        dateFounded: true,
        taxRate: true,
        warEligible: true,
        enlistedFactionId: true,
        homeStationId: true,
        homeStation: { select: { name: true } },
        url: true,
      },
      where: { allianceId },
      orderBy: [{ memberCount: "desc" }, { name: "asc" }],
    }),
    prisma.solarSystemSovereignty.findMany({
      select: {
        solarSystemId: true,
        corporationId: true,
        claimedSince: true,
        isCapitalSystem: true,
        sovereigntyHubId: true,
        vulnerabilityWindowStart: true,
        vulnerabilityWindowEnd: true,
        activityDefenseMultiplier: true,
        militaryLevel: true,
        industrialLevel: true,
        strategicLevel: true,
        solarSystem: {
          select: {
            name: true,
            securityStatus: true,
            constellationId: true,
            constellation: {
              select: {
                name: true,
                regionId: true,
                region: { select: { name: true } },
              },
            },
          },
        },
      },
      where: { allianceId },
    }),
    prisma.war.findMany({
      select: warSelect,
      where: { OR: [asAggressor, asDefender, asAlly] },
      orderBy: { declaredDate: "desc" },
      take: ALLIANCE_WAR_LIST_LIMIT,
    }),
    prisma.war.aggregate({
      where: asAggressor,
      _count: { warId: true },
      _sum: {
        aggressorShipsKilled: true,
        aggressorIskDestroyed: true,
        defenderShipsKilled: true,
        defenderIskDestroyed: true,
      },
    }),
    prisma.war.aggregate({
      where: asDefender,
      _count: { warId: true },
      _sum: {
        aggressorShipsKilled: true,
        aggressorIskDestroyed: true,
        defenderShipsKilled: true,
        defenderIskDestroyed: true,
      },
    }),
    prisma.war.count({ where: asAlly }),
    prisma.war.count({
      where: { AND: [{ OR: [asAggressor, asDefender, asAlly] }, unfinished] },
    }),
  ]);

  const warSummary: AllianceWarSummary = {
    total:
      aggressorTotals._count.warId + defenderTotals._count.warId + allyCount,
    asAggressor: aggressorTotals._count.warId,
    asDefender: defenderTotals._count.warId,
    asAlly: allyCount,
    ongoing,
    shipsKilled:
      (aggressorTotals._sum.aggressorShipsKilled ?? 0) +
      (defenderTotals._sum.defenderShipsKilled ?? 0),
    iskDestroyed:
      (aggressorTotals._sum.aggressorIskDestroyed ?? 0) +
      (defenderTotals._sum.defenderIskDestroyed ?? 0),
    shipsLost:
      (aggressorTotals._sum.defenderShipsKilled ?? 0) +
      (defenderTotals._sum.aggressorShipsKilled ?? 0),
    iskLost:
      (aggressorTotals._sum.defenderIskDestroyed ?? 0) +
      (defenderTotals._sum.aggressorIskDestroyed ?? 0),
  };

  return {
    allianceId: alliance.allianceId,
    name: alliance.name,
    ticker: alliance.ticker,
    dateFounded: alliance.dateFounded.toISOString(),
    isClosed: alliance.isDeleted,
    creatorCorporationId: alliance.creatorCorporationId,
    creatorCorporationName: alliance.creatorCorporation.name,
    executorCorporationId: alliance.executorCorporationId,
    executorCorporationName: alliance.executorCorporation?.name ?? null,
    factionId: alliance.factionId,
    factionName: alliance.faction?.name ?? null,
    corporations: corporations.map((corporation) => ({
      corporationId: corporation.corporationId,
      name: corporation.name,
      ticker: corporation.ticker,
      memberCount: corporation.memberCount,
      ceoId: corporation.ceoId,
      ceoName: corporation.ceo?.name ?? null,
      dateFounded: corporation.dateFounded?.toISOString() ?? null,
      taxRate: corporation.taxRate,
      warEligible: corporation.warEligible,
      enlistedFactionId: corporation.enlistedFactionId,
      homeStationId: corporation.homeStationId,
      homeStationName: corporation.homeStation?.name ?? null,
      url: corporation.url,
    })),
    sovereignty: sovereignty
      .map((system) => ({
        solarSystemId: system.solarSystemId,
        name: system.solarSystem.name,
        securityStatus: system.solarSystem.securityStatus.toNumber(),
        constellationId: system.solarSystem.constellationId,
        constellationName: system.solarSystem.constellation.name,
        regionId: system.solarSystem.constellation.regionId,
        regionName: system.solarSystem.constellation.region?.name ?? null,
        corporationId: system.corporationId,
        claimedSince: system.claimedSince?.toISOString() ?? null,
        isCapitalSystem: system.isCapitalSystem ?? false,
        sovereigntyHubId: system.sovereigntyHubId?.toString() ?? null,
        vulnerabilityWindowStart:
          system.vulnerabilityWindowStart?.toISOString() ?? null,
        vulnerabilityWindowEnd:
          system.vulnerabilityWindowEnd?.toISOString() ?? null,
        activityDefenseMultiplier: system.activityDefenseMultiplier,
        militaryLevel: system.militaryLevel,
        industrialLevel: system.industrialLevel,
        strategicLevel: system.strategicLevel,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    wars: wars.map((war) => toAllianceWar(war, allianceId, now)),
    warSummary,
    readAt: nowDate.toISOString(),
  };
}

/** What the page gets from {@link loadAllianceProfile}. */
export type AllianceProfileResult =
  | { ok: true; profile: AllianceProfile | null }
  | { ok: false };

/**
 * The page renders from ESI without this half, so a database failure degrades
 * to the ESI-only page instead of erroring the route. `ok: false` tells the
 * caller the read failed, so it can keep that degraded render out of the ISR
 * cache; `profile: null` is an alliance we have not stored, which is
 * legitimately cached.
 */
export const loadAllianceProfile = cache(
  async (allianceId: number): Promise<AllianceProfileResult> => {
    // `cache()` makes `generateMetadata` and the page share one attempt per
    // request. A good read is deduplicated by `"use cache"` anyway; a failed
    // one is not, and would otherwise hit a struggling database twice.
    try {
      return { ok: true, profile: await readAllianceProfile(allianceId) };
    } catch {
      return { ok: false };
    }
  },
);
