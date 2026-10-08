import { cacheLife, cacheTag } from "next/cache";

import type { Prisma } from "@jitaspace/db";

import type {
  IncursionHistory,
  IncursionLookups,
  IncursionRatGroup,
  IncursionRow,
  IncursionsData,
  IncursionSolarSystem,
  IncursionStateEventTuple,
} from "./types";
import { prisma } from "~/lib/db";
import { computeNpcStats } from "~/lib/npcStats";
import { readNpcStats } from "~/lib/npcStatsData";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";
import { longestDistanceAu } from "./math";
import { isTrackedIncursion } from "./types";

/**
 * How far back the page itself carries ended incursions: enough for the
 * high-sec spawn countdown. The full history is
 * `readIncursionHistory`, behind `/api/incursions/history`.
 */
const RECENTLY_ENDED_MS = 30 * 24 * 60 * 60 * 1000;
/** How far back the influence charts go. */
const INFLUENCE_WINDOW_MS = 72 * 60 * 60 * 1000;
/** The events the spawn history lists. */
const STATE_EVENT_KINDS = ["appeared", "state_changed", "ended"] as const;

const iso = (date: Date | null) => date?.toISOString() ?? null;
const unique = <T>(values: Iterable<T>) => [...new Set(values)];

const incursionSelect = {
  incursionId: true,
  constellationId: true,
  factionId: true,
  type: true,
  source: true,
  stagingSolarSystemId: true,
  stagingSovereigntyAllianceId: true,
  stagingSovereigntyFactionId: true,
  state: true,
  influence: true,
  hasBoss: true,
  firstSeenAt: true,
  lastSeenAt: true,
  endedAt: true,
  isObservedFromStart: true,
  establishedAt: true,
  mobilizingAt: true,
  withdrawingAt: true,
  infestedSolarSystems: { select: { solarSystemId: true } },
} as const;

type SelectedIncursion = Prisma.IncursionGetPayload<{
  select: typeof incursionSelect;
}>;

const toRow = ({
  infestedSolarSystems,
  ...incursion
}: SelectedIncursion): IncursionRow => ({
  ...incursion,
  infestedSolarSystemIds: infestedSolarSystems
    .map((system) => system.solarSystemId)
    .sort((a, b) => a - b),
  firstSeenAt: incursion.firstSeenAt.toISOString(),
  lastSeenAt: incursion.lastSeenAt.toISOString(),
  endedAt: iso(incursion.endedAt),
  establishedAt: iso(incursion.establishedAt),
  mobilizingAt: iso(incursion.mobilizingAt),
  withdrawingAt: iso(incursion.withdrawingAt),
});

/**
 * The names of everything the given incursions refer to:
 * constellations and their regions, factions, sovereignty-holding alliances,
 * and solar systems with their security.
 */
async function readLookups({
  incursions,
  allianceIds = [],
  factionIds = [],
}: {
  incursions: readonly IncursionRow[];
  allianceIds?: readonly (number | null)[];
  factionIds?: readonly (number | null)[];
}): Promise<IncursionLookups> {
  const notNull = <T>(value: T | null): value is T => value !== null;
  const [constellations, solarSystems, factions, alliances] = await Promise.all(
    [
      prisma.constellation.findMany({
        select: { constellationId: true, name: true, regionId: true },
        where: {
          constellationId: {
            in: unique(incursions.map((i) => i.constellationId)),
          },
        },
      }),
      prisma.solarSystem.findMany({
        select: { solarSystemId: true, name: true, securityStatus: true },
        where: {
          solarSystemId: {
            in: unique(
              incursions.flatMap((i) => [
                ...(i.stagingSolarSystemId === null
                  ? []
                  : [i.stagingSolarSystemId]),
                ...i.infestedSolarSystemIds,
              ]),
            ),
          },
        },
      }),
      prisma.faction.findMany({
        select: { factionId: true, name: true },
        where: {
          factionId: {
            in: unique(
              [
                ...incursions.map((i) => i.factionId),
                ...incursions.map((i) => i.stagingSovereigntyFactionId),
                ...factionIds,
              ].filter(notNull),
            ),
          },
        },
      }),
      prisma.alliance.findMany({
        select: { allianceId: true, name: true },
        where: {
          allianceId: {
            in: unique(
              [
                ...incursions.map((i) => i.stagingSovereigntyAllianceId),
                ...allianceIds,
              ].filter(notNull),
            ),
          },
        },
      }),
    ],
  );
  const regions = await prisma.region.findMany({
    select: { regionId: true, name: true },
    where: { regionId: { in: unique(constellations.map((c) => c.regionId)) } },
  });
  return {
    constellations: Object.fromEntries(
      constellations.map((c) => [
        c.constellationId,
        { name: c.name, regionId: c.regionId },
      ]),
    ),
    regions: Object.fromEntries(regions.map((r) => [r.regionId, r.name])),
    factions: Object.fromEntries(factions.map((f) => [f.factionId, f.name])),
    alliances: Object.fromEntries(alliances.map((a) => [a.allianceId, a.name])),
    solarSystems: Object.fromEntries(
      solarSystems.map((system) => [
        system.solarSystemId,
        {
          name: system.name,
          securityStatus: Number(system.securityStatus),
        },
      ]),
    ),
  };
}

/**
 * Everything the page shows up front: the active incursions, which the
 * `esi-track-incursions` job writes every 5 minutes, those that ended in the
 * last 30 days, and the SDE names, stations and celestials
 * around them. Deliberately uncaught: see CLAUDE.md → "Never catch a database
 * error inside a `"use cache"` scope".
 */
export async function readIncursionsData(): Promise<IncursionsData> {
  "use cache";
  cacheLife("minutes");
  // Names, stations and celestials are SDE data: an ingest refreshes them.
  cacheTag(SDE_CACHE_TAG);

  const readAt = new Date();
  const [active, recentlyEnded] = await Promise.all([
    prisma.incursion.findMany({
      select: incursionSelect,
      where: { endedAt: null },
      orderBy: { firstSeenAt: "asc" },
    }),
    prisma.incursion.findMany({
      select: incursionSelect,
      where: {
        endedAt: { gte: new Date(readAt.getTime() - RECENTLY_ENDED_MS) },
      },
      orderBy: { endedAt: "desc" },
    }),
  ]);
  const activeIds = active.map((i) => i.incursionId);

  const incursions = [...active, ...recentlyEnded].map(toRow);

  // An incursion's influence just before the window, and every change in it.
  const windowStart = new Date(readAt.getTime() - INFLUENCE_WINDOW_MS);
  const influenceKinds = ["appeared", "resumed", "influence_changed"] as const;
  const [influenceEvents, influenceBefore] = await Promise.all([
    prisma.incursionEvent.findMany({
      select: { incursionId: true, observedAt: true, influence: true },
      where: {
        incursionId: { in: activeIds },
        kind: { in: [...influenceKinds] },
        influence: { not: null },
        observedAt: { gte: windowStart },
      },
      orderBy: { observedAt: "asc" },
    }),
    prisma.incursionEvent.findMany({
      select: { incursionId: true, observedAt: true, influence: true },
      where: {
        incursionId: { in: activeIds },
        kind: { in: [...influenceKinds] },
        influence: { not: null },
        observedAt: { lt: windowStart },
      },
      orderBy: { observedAt: "desc" },
      distinct: ["incursionId"],
    }),
  ]);
  const influence: IncursionsData["influence"] = {};
  for (const event of [...influenceBefore, ...influenceEvents]) {
    if (event.influence === null) continue;
    const readings = influence[event.incursionId] ?? [];
    readings.push([event.observedAt.getTime(), event.influence]);
    influence[event.incursionId] = readings;
  }

  const activeRows = incursions
    .filter((i) => i.endedAt === null)
    .filter(isTrackedIncursion);
  const activeSystemIds = unique(
    activeRows.flatMap((i) => [
      i.stagingSolarSystemId,
      ...i.infestedSolarSystemIds,
    ]),
  );

  const [sovereignty, celestials, stations] = await Promise.all([
    prisma.solarSystemSovereignty.findMany({
      select: { solarSystemId: true, allianceId: true, factionId: true },
      where: {
        solarSystemId: {
          in: unique(activeRows.map((i) => i.stagingSolarSystemId)),
        },
      },
    }),
    readCelestialPositions(activeSystemIds),
    prisma.station.findMany({
      select: {
        stationId: true,
        name: true,
        solarSystemId: true,
        operationId: true,
      },
      where: { solarSystemId: { in: activeSystemIds }, isDeleted: false },
      orderBy: { name: "asc" },
    }),
  ]);

  const [lookups, repairServices] = await Promise.all([
    readLookups({
      incursions,
      allianceIds: sovereignty.map((row) => row.allianceId),
      factionIds: sovereignty.map((row) => row.factionId),
    }),
    prisma.stationService.findMany({
      select: { stationServiceId: true },
      where: { name: { contains: "Repair" } },
    }),
  ]);
  const repairOperationIds = new Set(
    (
      await prisma.stationOperationService.findMany({
        select: { stationOperationId: true },
        where: {
          stationOperationId: {
            in: unique(
              stations.flatMap((s) =>
                s.operationId === null ? [] : [s.operationId],
              ),
            ),
          },
          isDeleted: false,
          serviceId: {
            in: repairServices.map((service) => service.stationServiceId),
          },
        },
      })
    ).map((row) => row.stationOperationId),
  );

  const systems: Record<number, IncursionSolarSystem> = lookups.solarSystems;
  for (const solarSystemId of activeSystemIds) {
    const system = systems[solarSystemId];
    if (!system) continue;
    system.longestWarpAu = longestDistanceAu(
      celestials.get(solarSystemId) ?? [],
    );
    system.stations = stations
      .filter((s) => s.solarSystemId === solarSystemId)
      .map((s) => ({
        stationId: s.stationId,
        name: s.name,
        hasRepair:
          s.operationId !== null && repairOperationIds.has(s.operationId),
      }));
  }

  return {
    ...lookups,
    readAt: readAt.toISOString(),
    incursions,
    influence,
    currentSovereignty: Object.fromEntries(
      sovereignty.map((row) => [
        row.solarSystemId,
        { allianceId: row.allianceId, factionId: row.factionId },
      ]),
    ),
    solarSystems: systems,
  };
}

/**
 * Every incursion that has ended, ours and imported (back to 2015), and every
 * appearance, state change and end, for the History tab. Too heavy for the
 * page itself, so `/api/incursions/history` serves it when the tab opens.
 * Deliberately uncaught, like `readIncursionsData`.
 */
export async function readIncursionHistory(): Promise<IncursionHistory> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SDE_CACHE_TAG);

  const readAt = new Date();
  const [ended, stateEvents] = await Promise.all([
    prisma.incursion.findMany({
      select: incursionSelect,
      where: { endedAt: { not: null } },
      orderBy: { endedAt: "desc" },
    }),
    prisma.incursionEvent.findMany({
      select: {
        eventId: true,
        incursionId: true,
        observedAt: true,
        kind: true,
        state: true,
      },
      where: { kind: { in: [...STATE_EVENT_KINDS] } },
      orderBy: [{ observedAt: "desc" }, { eventId: "desc" }],
    }),
  ]);

  // State events of the incursions still active are in the history too.
  const endedIds = new Set(ended.map((i) => i.incursionId));
  const activeIds = unique(stateEvents.map((e) => e.incursionId)).filter(
    (id) => !endedIds.has(id),
  );
  const active =
    activeIds.length === 0
      ? []
      : await prisma.incursion.findMany({
          select: incursionSelect,
          where: { incursionId: { in: activeIds } },
        });
  const incursions = [...ended, ...active].map(toRow);

  return {
    ...(await readLookups({ incursions })),
    readAt: readAt.toISOString(),
    incursions,
    stateEvents: stateEvents.map((event) => [
      event.eventId,
      event.incursionId,
      event.observedAt.toISOString(),
      event.kind as IncursionStateEventTuple[3],
      event.state,
    ]),
  };
}

/**
 * The in-system positions of everything a ship warps between at system scale:
 * the star (the origin of in-system coordinates), planets, stargates and
 * stations. Moons and belts sit beside their planets, so they barely move the
 * longest distance and are left out.
 */
async function readCelestialPositions(solarSystemIds: number[]) {
  const where = { solarSystemId: { in: solarSystemIds } };
  const position = { positionX: true, positionY: true, positionZ: true };
  const [planets, stargates, stations] = await Promise.all([
    prisma.planet.findMany({
      select: { solarSystemId: true, ...position },
      where,
    }),
    prisma.stargate.findMany({
      select: { solarSystemId: true, ...position },
      where,
    }),
    prisma.station.findMany({
      select: { solarSystemId: true, ...position },
      where,
    }),
  ]);
  const bySystem = new Map(
    solarSystemIds.map((id) => [id, [{ x: 0, y: 0, z: 0 }]]),
  );
  for (const row of [...planets, ...stargates, ...stations]) {
    if (
      row.solarSystemId === null ||
      row.positionX === null ||
      row.positionY === null ||
      row.positionZ === null
    ) {
      continue;
    }
    bySystem
      .get(row.solarSystemId)
      ?.push({ x: row.positionX, y: row.positionY, z: row.positionZ });
  }
  return bySystem;
}

/** The NPC groups incursions spawn, largest first, as eve-incursions.de showed them. */
const RAT_GROUP_IDS = [1056, 1054, 1053, 1052];
/**
 * Types in those groups that never fly in an incursion: three duplicate
 * "Slave" battleships (Endoma01, Heavenbound02, Tama01) and a test NPC.
 */
const EXCLUDED_RAT_TYPE_IDS = [3486, 3487, 3490, 3511];

/** The Sansha incursion NPCs and their combat figures; SDE data only. */
export async function readIncursionRats(): Promise<IncursionRatGroup[]> {
  "use cache";
  cacheSdeRead();
  const [groups, types] = await Promise.all([
    prisma.group.findMany({
      select: { groupId: true, name: true },
      where: { groupId: { in: RAT_GROUP_IDS } },
    }),
    prisma.type.findMany({
      select: { typeId: true, name: true, groupId: true },
      where: {
        groupId: { in: RAT_GROUP_IDS },
        typeId: { notIn: EXCLUDED_RAT_TYPE_IDS },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const stats = await readNpcStats(types.map((t) => t.typeId));

  const groupName = new Map(groups.map((g) => [g.groupId, g.name]));
  return RAT_GROUP_IDS.flatMap((groupId) => {
    const rats = types
      .filter((t) => t.groupId === groupId)
      .map((t) => ({
        typeId: t.typeId,
        name: t.name,
        stats: stats.get(t.typeId) ?? computeNpcStats(new Map()),
      }));
    return rats.length === 0
      ? []
      : [{ groupId, name: groupName.get(groupId) ?? `Group ${groupId}`, rats }];
  });
}
