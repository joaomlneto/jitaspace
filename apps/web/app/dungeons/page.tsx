import type { DungeonIndexRow, DungeonsIndex } from "./page.client";
import { prisma } from "~/lib/db";
import { loadStoredDungeonNames } from "~/lib/dungeon-names";
import { pageMetadata } from "~/lib/metadata";
import { cacheSdeRead } from "~/lib/sdeCache";
import DungeonsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Dungeons",
  description:
    "Browse EVE Online's dungeons — combat sites, anomalies, escalations and mission pockets — with their archetypes, factions and ship restrictions.",
  path: "/dungeons",
  badge: "Dungeons",
});

export default async function Page() {
  const [index, storedNames] = await Promise.all([
    readDungeonsIndex(),
    loadStoredDungeonNames(),
  ]);
  // Name the pockets dungeons.yaml only refers to from the game client's names.
  const dungeons = index.dungeons.map((dungeon) => {
    const name = dungeon.name ?? storedNames.get(dungeon.dungeonId);
    return name === undefined ? dungeon : { ...dungeon, name };
  });
  return <DungeonsPage index={{ ...index, dungeons }} />;
}

/** Every dungeon the SDE knows of, with the lookup tables beside them. */
async function readDungeonsIndex(): Promise<DungeonsIndex> {
  "use cache";
  cacheSdeRead();
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. See CLAUDE.md → "Never catch a database
  // error inside a `"use cache"` scope".
  const [dungeons, restrictions, missions, agents, operations, archetypes] =
    await Promise.all([
      prisma.dungeon.findMany({
        select: {
          dungeonId: true,
          name: true,
          archetypeId: true,
          factionId: true,
          description: true,
          gameplayDescription: true,
        },
        where: { isDeleted: false },
      }),
      prisma.dungeonAllowedShip.groupBy({
        by: ["dungeonId"],
        _count: { _all: true },
        where: { isDeleted: false },
      }),
      prisma.mission.findMany({
        select: { missionId: true, name: true, killDungeonId: true },
        where: { killDungeonId: { not: null }, isDeleted: false },
        orderBy: { missionId: "asc" },
      }),
      prisma.agentInSpace.groupBy({
        by: ["dungeonId"],
        _count: { _all: true },
        where: { isDeleted: false },
      }),
      prisma.mercenaryTacticalOperation.findMany({
        select: { dungeonId: true },
        where: { isDeleted: false },
      }),
      prisma.archetype.findMany({
        select: { archetypeId: true, title: true },
        where: { isDeleted: false },
      }),
    ]);
  const factions = await prisma.faction.findMany({
    select: { factionId: true, name: true },
    where: {
      factionId: {
        in: [
          ...new Set(
            dungeons.flatMap((d) =>
              d.factionId === null ? [] : [d.factionId],
            ),
          ),
        ],
      },
    },
  });

  // Every dungeon the SDE knows of: the ones dungeons.yaml describes, plus the
  // mission, agent and operation pockets it only refers to by id.
  const rows = new Map<number, DungeonIndexRow>();
  const row = (dungeonId: number) => {
    let existing = rows.get(dungeonId);
    if (!existing) {
      existing = { dungeonId, described: false };
      rows.set(dungeonId, existing);
    }
    return existing;
  };
  for (const dungeon of dungeons) {
    const entry = row(dungeon.dungeonId);
    entry.described = true;
    entry.name = dungeon.name;
    entry.archetypeId = dungeon.archetypeId;
    if (dungeon.factionId !== null) entry.factionId = dungeon.factionId;
    if (dungeon.description !== null || dungeon.gameplayDescription !== null) {
      entry.hasDescription = true;
    }
  }
  for (const restriction of restrictions) {
    row(restriction.dungeonId).restrictionCount = restriction._count._all;
  }
  for (const mission of missions) {
    if (mission.killDungeonId === null) continue;
    const entry = row(mission.killDungeonId);
    entry.missionCount = (entry.missionCount ?? 0) + 1;
    // The lowest-id mission names a pocket dungeons.yaml leaves unnamed.
    entry.firstMission ??= [mission.missionId, mission.name];
  }
  for (const agent of agents) {
    row(agent.dungeonId).agentCount = agent._count._all;
  }
  for (const operation of operations) {
    const entry = row(operation.dungeonId);
    entry.operationCount = (entry.operationCount ?? 0) + 1;
  }

  const index: DungeonsIndex = {
    dungeons: [...rows.values()].sort((a, b) => a.dungeonId - b.dungeonId),
    archetypes: {},
    factions: {},
  };

  for (const archetype of archetypes) {
    if (archetype.title !== null) {
      index.archetypes[archetype.archetypeId] = archetype.title;
    }
  }
  for (const faction of factions) {
    index.factions[faction.factionId] = faction.name;
  }

  return index;
}
