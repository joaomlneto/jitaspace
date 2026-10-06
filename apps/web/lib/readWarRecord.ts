import type { Prisma } from "@jitaspace/db";

import type { EntityWar, WarParty, WarRole, WarSummary } from "~/lib/warRecord";
import { prisma } from "~/lib/db";
import { WAR_LIST_LIMIT } from "~/lib/warRecord";
import { deriveWarStatus } from "~/lib/warStatus";

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

/** The three ways a party can be in a war, as `War` filters. */
function partyFilters({ kind, id }: WarParty) {
  return kind === "alliance"
    ? {
        asAggressor: { aggressorAllianceId: id },
        asDefender: { defenderAllianceId: id },
        asAlly: { allianceAllies: { some: { allianceId: id } } },
      }
    : {
        asAggressor: { aggressorCorporationId: id },
        asDefender: { defenderCorporationId: id },
        asAlly: { corporationAllies: { some: { corporationId: id } } },
      };
}

function roleOf(war: RawWar, { kind, id }: WarParty): WarRole {
  const aggressor =
    kind === "alliance" ? war.aggressorAllianceId : war.aggressorCorporationId;
  const defender =
    kind === "alliance" ? war.defenderAllianceId : war.defenderCorporationId;
  if (aggressor === id) return "aggressor";
  if (defender === id) return "defender";
  return "ally";
}

function toEntityWar(war: RawWar, party: WarParty, now: number): EntityWar {
  return {
    warId: war.warId,
    role: roleOf(war, party),
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

const tallies = {
  aggressorShipsKilled: true,
  aggressorIskDestroyed: true,
  defenderShipsKilled: true,
  defenderIskDestroyed: true,
} as const;

/**
 * A party's wars: the most recently declared {@link WAR_LIST_LIMIT}, and
 * totals over all of them. Not cached itself; call it from the page's
 * `"use cache"` read. It throws on a database failure.
 */
export async function readWarRecord(
  party: WarParty,
  now: number,
): Promise<{ wars: EntityWar[]; summary: WarSummary }> {
  const { asAggressor, asDefender, asAlly } = partyFilters(party);
  const unfinished = {
    OR: [{ finishedDate: null }, { finishedDate: { gt: new Date(now) } }],
  };

  const [wars, aggressorTotals, defenderTotals, allyCount, ongoing] =
    await Promise.all([
      prisma.war.findMany({
        select: warSelect,
        where: { OR: [asAggressor, asDefender, asAlly] },
        orderBy: { declaredDate: "desc" },
        take: WAR_LIST_LIMIT,
      }),
      prisma.war.aggregate({
        where: asAggressor,
        _count: { warId: true },
        _sum: tallies,
      }),
      prisma.war.aggregate({
        where: asDefender,
        _count: { warId: true },
        _sum: tallies,
      }),
      prisma.war.count({ where: asAlly }),
      prisma.war.count({
        where: {
          AND: [{ OR: [asAggressor, asDefender, asAlly] }, unfinished],
        },
      }),
    ]);

  return {
    wars: wars.map((war) => toEntityWar(war, party, now)),
    summary: {
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
    },
  };
}
