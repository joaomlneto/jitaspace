import type { MissionIndexRow, MissionsIndex } from "./page.client";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { missionKind } from "~/lib/missions";
import { cacheSdeRead } from "~/lib/sdeCache";
import MissionsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Missions",
  description:
    "Browse every EVE Online agent mission — encounters, courier runs and epic arc steps, with their factions, objectives and rewards.",
  path: "/missions",
  badge: "Missions",
});

const toRecord = (
  rows: { id: number; name: string | null }[],
): Record<number, string> => {
  const record: Record<number, string> = {};
  for (const row of rows) if (row.name !== null) record[row.id] = row.name;
  return record;
};

export default async function Page() {
  "use cache";
  cacheSdeRead();
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. See CLAUDE.md → "Never catch a database
  // error inside a `"use cache"` scope".
  const [missions, arcSteps, briefings] = await Promise.all([
    prisma.mission.findMany({
      where: { isDeleted: false },
      orderBy: { missionId: "asc" },
    }),
    prisma.epicArcMission.findMany({
      select: {
        missionId: true,
        epicArc: { select: { epicArcId: true, name: true } },
      },
      where: { isDeleted: false, epicArc: { isDeleted: false } },
    }),
    prisma.missionMessage.findMany({
      select: { missionId: true },
      where: { key: "messages.mission.briefing", isDeleted: false },
    }),
  ]);

  const ids = (pick: (m: (typeof missions)[number]) => (number | null)[]) => [
    ...new Set(
      missions.flatMap(pick).filter((id): id is number => id !== null),
    ),
  ];
  const [factions, corporations, agentTypes, types, dungeons] =
    await Promise.all([
      prisma.faction.findMany({
        select: { factionId: true, name: true },
        where: { factionId: { in: ids((m) => [m.factionId]) } },
      }),
      prisma.corporation.findMany({
        select: { corporationId: true, name: true },
        where: { corporationId: { in: ids((m) => [m.corporationId]) } },
      }),
      prisma.agentType.findMany({ select: { agentTypeId: true, name: true } }),
      prisma.type.findMany({
        select: { typeId: true, name: true },
        where: {
          typeId: {
            in: ids((m) => [
              m.killObjectiveTypeId,
              m.courierObjectiveTypeId,
              m.rewardTypeId,
              m.bonusRewardTypeId,
            ]),
          },
        },
      }),
      prisma.dungeon.findMany({
        select: { dungeonId: true, name: true },
        where: {
          dungeonId: { in: ids((m) => [m.killDungeonId]) },
          isDeleted: false,
        },
      }),
    ]);

  const arcOf = new Map(
    arcSteps.map((step) => [step.missionId, step.epicArc.epicArcId]),
  );
  const hasBriefing = new Set(briefings.map((row) => row.missionId));

  const rows = missions.map((mission): MissionIndexRow => {
    const kind = missionKind(mission);
    const objectiveTypeId =
      kind === "kill"
        ? mission.killObjectiveTypeId
        : mission.courierObjectiveTypeId;
    const objectiveQuantity =
      kind === "kill"
        ? mission.killObjectiveQuantity
        : mission.courierObjectiveQuantity;
    // Only what a row has: the list is one cache entry and RSC payload, so
    // ~2,900 rows of explicit nulls would roughly double it.
    const row: MissionIndexRow = {
      missionId: mission.missionId,
      name: mission.name,
      kind,
      hasBriefing: hasBriefing.has(mission.missionId),
    };
    const set = <K extends keyof MissionIndexRow>(
      key: K,
      value: MissionIndexRow[K] | null | undefined,
    ) => {
      if (value != null) row[key] = value;
    };
    set("factionId", mission.factionId);
    set("corporationId", mission.corporationId);
    set("agentTypeId", mission.agentTypeId);
    set("dungeonId", mission.killDungeonId);
    set("objectiveTypeId", objectiveTypeId);
    set(
      "objectiveQuantity",
      objectiveTypeId === null ? null : objectiveQuantity,
    );
    set("rewardTypeId", mission.rewardTypeId);
    set("rewardQuantity", mission.rewardQuantity);
    set("bonusRewardTypeId", mission.bonusRewardTypeId);
    set("bonusRewardQuantity", mission.bonusRewardQuantity);
    set("bonusTimeInterval", mission.bonusTimeInterval);
    set("expirationTime", mission.expirationTime);
    set("hasStandingRewards", mission.hasStandingRewards);
    set("epicArcId", arcOf.get(mission.missionId));
    return row;
  });

  const index: MissionsIndex = {
    missions: rows,
    factions: toRecord(
      factions.map((f) => ({ id: f.factionId, name: f.name })),
    ),
    corporations: toRecord(
      corporations.map((c) => ({ id: c.corporationId, name: c.name })),
    ),
    agentTypes: toRecord(
      agentTypes.map((a) => ({ id: a.agentTypeId, name: a.name })),
    ),
    types: toRecord(types.map((t) => ({ id: t.typeId, name: t.name }))),
    dungeons: toRecord(
      dungeons.map((d) => ({ id: d.dungeonId, name: d.name })),
    ),
    epicArcs: toRecord(
      arcSteps.map((step) => ({
        id: step.epicArc.epicArcId,
        name: step.epicArc.name,
      })),
    ),
  };

  return <MissionsPage index={index} />;
}
