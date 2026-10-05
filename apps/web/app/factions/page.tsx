import type { FactionRow } from "./page.client";
import { prisma } from "~/lib/db";
import { systemFactionId, systemFactionSelect } from "~/lib/factionTerritory";
import { pageMetadata } from "~/lib/metadata";
import { cacheSdeRead } from "~/lib/sdeCache";
import FactionsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Factions",
  description:
    "Every faction in EVE Online — the four empires, the pirates and the rest: their territory, stations, corporations, militias and headquarters.",
  path: "/factions",
  badge: "Factions",
});

export default async function Page() {
  "use cache";
  // Every read is a table the SDE ingest writes.
  cacheSdeRead();
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. See CLAUDE.md → "Never catch a database
  // error inside a `"use cache"` scope".
  const [factions, systems, corporations, items] = await Promise.all([
    prisma.faction.findMany({
      select: {
        factionId: true,
        name: true,
        shortDescription: true,
        stationCount: true,
        stationSystemCount: true,
        sizeFactor: true,
        militiaCorporationId: true,
        militiaCorporation: { select: { name: true } },
        solarSystem: {
          select: {
            solarSystemId: true,
            name: true,
            securityStatus: true,
            constellation: {
              select: { region: { select: { regionId: true, name: true } } },
            },
          },
        },
      },
      where: { isDeleted: false },
    }),
    // Territory as the SDE assigns it, region down to system (see
    // lib/factionTerritory.ts): ~8k small rows, resolved here.
    prisma.solarSystem.findMany({
      select: systemFactionSelect,
      where: { isDeleted: false },
    }),
    prisma.corporation.groupBy({
      by: ["factionId"],
      where: { factionId: { not: null }, isDeleted: false },
      _count: { corporationId: true },
    }),
    prisma.type.groupBy({
      by: ["factionId"],
      where: { factionId: { not: null }, isDeleted: false },
      _count: { typeId: true },
    }),
  ]);

  const systemsByFaction = new Map<number, number>();
  for (const system of systems) {
    const factionId = systemFactionId(system);
    if (factionId === null) continue;
    systemsByFaction.set(factionId, (systemsByFaction.get(factionId) ?? 0) + 1);
  }
  const corporationsByFaction = new Map(
    corporations.map((group) => [group.factionId, group._count.corporationId]),
  );
  const itemsByFaction = new Map(
    items.map((group) => [group.factionId, group._count.typeId]),
  );

  const rows: FactionRow[] = factions
    .map((faction) => {
      const headquarters = faction.solarSystem;
      const region = headquarters?.constellation.region ?? null;
      return {
        factionId: faction.factionId,
        name: faction.name,
        shortDescription: faction.shortDescription,
        systems: systemsByFaction.get(faction.factionId) ?? 0,
        stations: faction.stationCount,
        stationSystems: faction.stationSystemCount,
        corporations: corporationsByFaction.get(faction.factionId) ?? 0,
        items: itemsByFaction.get(faction.factionId) ?? 0,
        sizeFactor: faction.sizeFactor,
        militiaCorporationId: faction.militiaCorporationId,
        militiaName: faction.militiaCorporation?.name ?? null,
        headquartersId: headquarters?.solarSystemId ?? null,
        headquartersName: headquarters?.name ?? null,
        headquartersSecurity:
          headquarters == null ? null : Number(headquarters.securityStatus),
        regionId: region?.regionId ?? null,
        regionName: region?.name ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return <FactionsPage factions={rows} />;
}
