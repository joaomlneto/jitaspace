import { cacheLife } from "next/cache";

import type {
  WarRoomAggressor,
  WarRoomData,
  WarRoomStats,
  WarRoomWar,
  WarStatus,
} from "~/components/Wars/WarRoom/types";
import { prisma } from "~/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

interface RawWar {
  warId: number;
  aggressorCorporationId: number | null;
  aggressorAllianceId: number | null;
  aggressorIskDestroyed: number;
  aggressorShipsKilled: number;
  allianceAllies: { allianceId: number }[];
  corporationAllies: { corporationId: number }[];
  declaredDate: Date;
  defenderCorporationId: number | null;
  defenderAllianceId: number | null;
  defenderIskDestroyed: number;
  defenderShipsKilled: number;
  startedDate: Date | null;
  finishedDate: Date | null;
  isMutual: boolean;
  isOpenForAllies: boolean;
  retractedDate: Date | null;
  updatedAt: Date;
}

function deriveStatus(war: RawWar, now: number): WarStatus {
  const started = war.startedDate?.getTime();
  if (started === undefined || started > now) return "pending";
  const retracted = war.retractedDate?.getTime();
  if (retracted !== undefined && retracted <= now) return "retracting";
  return "active";
}

function enrichWar(war: RawWar, now: number): WarRoomWar {
  const status = deriveStatus(war, now);
  const totalIskDestroyed =
    war.aggressorIskDestroyed + war.defenderIskDestroyed;
  const totalShipsKilled = war.aggressorShipsKilled + war.defenderShipsKilled;

  const started = war.startedDate?.getTime();
  const ageDays =
    started !== undefined && started <= now ? (now - started) / DAY_MS : 0;
  const aggressorIskShare =
    totalIskDestroyed > 0
      ? war.aggressorIskDestroyed / totalIskDestroyed
      : null;

  return {
    warId: war.warId,
    aggressorCorporationId: war.aggressorCorporationId ?? undefined,
    aggressorAllianceId: war.aggressorAllianceId ?? undefined,
    aggressorIskDestroyed: war.aggressorIskDestroyed,
    aggressorShipsKilled: war.aggressorShipsKilled,
    defenderCorporationId: war.defenderCorporationId ?? undefined,
    defenderAllianceId: war.defenderAllianceId ?? undefined,
    defenderIskDestroyed: war.defenderIskDestroyed,
    defenderShipsKilled: war.defenderShipsKilled,
    allianceAllies: war.allianceAllies.map((a) => a.allianceId),
    corporationAllies: war.corporationAllies.map((a) => a.corporationId),
    declaredDate: war.declaredDate.toISOString(),
    startedDate: war.startedDate?.toISOString(),
    finishedDate: war.finishedDate?.toISOString(),
    retractedDate: war.retractedDate?.toISOString(),
    isMutual: war.isMutual,
    isOpenForAllies: war.isOpenForAllies,
    updatedAt: war.updatedAt.toISOString(),
    status,
    totalIskDestroyed,
    totalShipsKilled,
    ageDays,
    aggressorIskShare,
  };
}

function computeStats(wars: WarRoomWar[], now: number): WarRoomStats {
  const stats: WarRoomStats = {
    totalActive: wars.length,
    activeCount: 0,
    startingCount: 0,
    endingCount: 0,
    mutualCount: 0,
    openForAlliesCount: 0,
    totalIskDestroyed: 0,
    totalShipsKilled: 0,
    warsWithCombat: 0,
    declaredLast24h: 0,
    declaredLast7d: 0,
    generatedAt: new Date(now).toISOString(),
  };

  for (const war of wars) {
    if (war.status === "pending") stats.startingCount += 1;
    else if (war.status === "retracting") stats.endingCount += 1;
    else stats.activeCount += 1;
    if (war.isMutual) stats.mutualCount += 1;
    if (war.isOpenForAllies) stats.openForAlliesCount += 1;
    stats.totalIskDestroyed += war.totalIskDestroyed;
    stats.totalShipsKilled += war.totalShipsKilled;
    if (war.totalShipsKilled > 0 || war.totalIskDestroyed > 0)
      stats.warsWithCombat += 1;
    const declared = new Date(war.declaredDate).getTime();
    if (now - declared <= DAY_MS) stats.declaredLast24h += 1;
    if (now - declared <= 7 * DAY_MS) stats.declaredLast7d += 1;
  }

  return stats;
}

function computeTopAggressors(wars: WarRoomWar[]): WarRoomAggressor[] {
  const byEntity = new Map<string, WarRoomAggressor>();

  for (const war of wars) {
    const isAlliance = war.aggressorAllianceId != null;
    const id = war.aggressorAllianceId ?? war.aggressorCorporationId;
    if (id == null) continue;
    const key = `${isAlliance ? "a" : "c"}:${id}`;
    const existing = byEntity.get(key);
    if (existing) {
      existing.warCount += 1;
      existing.iskDestroyed += war.aggressorIskDestroyed;
      existing.shipsKilled += war.aggressorShipsKilled;
    } else {
      byEntity.set(key, {
        allianceId: isAlliance ? id : undefined,
        corporationId: isAlliance ? undefined : id,
        warCount: 1,
        iskDestroyed: war.aggressorIskDestroyed,
        shipsKilled: war.aggressorShipsKilled,
      });
    }
  }

  return [...byEntity.values()]
    .sort((a, b) => b.warCount - a.warCount || b.iskDestroyed - a.iskDestroyed)
    .slice(0, 10);
}

export async function getWarRoomData(): Promise<WarRoomData> {
  "use cache";
  cacheLife("hours");

  const now = Date.now();

  const rawWars = (await prisma.war.findMany({
    select: {
      warId: true,
      aggressorCorporationId: true,
      aggressorAllianceId: true,
      aggressorIskDestroyed: true,
      aggressorShipsKilled: true,
      allianceAllies: { select: { allianceId: true } },
      corporationAllies: { select: { corporationId: true } },
      declaredDate: true,
      defenderCorporationId: true,
      defenderAllianceId: true,
      defenderIskDestroyed: true,
      defenderShipsKilled: true,
      startedDate: true,
      finishedDate: true,
      isMutual: true,
      isOpenForAllies: true,
      retractedDate: true,
      updatedAt: true,
    },
    where: {
      isDeleted: false,
      OR: [
        { finishedDate: { gte: new Date(now) } },
        { finishedDate: { equals: null } },
      ],
    },
  })) as RawWar[];

  const wars = rawWars
    .map((war) => enrichWar(war, now))
    .sort((a, b) => b.totalIskDestroyed - a.totalIskDestroyed);

  const stats = computeStats(wars, now);
  const topAggressors = computeTopAggressors(wars);

  return { stats, wars, topAggressors };
}
