import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  plainString,
  present,
  requiredBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeFactionsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeFactions = defineJob<
  IngestSdeFactionsEventPayload["data"]
>({
  id: "ingest-sde-factions",
  name: "Ingest SDE Factions",
  description:
    "Download the SDE and ingest factions.yaml into the Faction table. stationCount/stationSystemCount are computed by aggregating npcStations per faction (via owner corporation).",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "factions.yaml",
      "npcStations.yaml",
      "npcCorporations.yaml",
    ]);

    // Map each NPC corporation to its faction…
    const corpFaction = new Map<number, number>();
    for (const [corporationId, corporation] of Object.entries(
      files["npcCorporations.yaml"],
    )) {
      const factionId = (corporation as Record<string, unknown>).factionID;
      if (factionId != null) {
        corpFaction.set(Number(corporationId), Number(factionId));
      }
    }

    // …then aggregate stations (and their distinct systems) per faction.
    const counts = new Map<
      number,
      { stations: number; systems: Set<number> }
    >();
    for (const station of Object.values(files["npcStations.yaml"])) {
      const record = station as Record<string, unknown>;
      const factionId = corpFaction.get(Number(record.ownerID));
      if (factionId == null) continue;
      const entry = counts.get(factionId) ?? {
        stations: 0,
        systems: new Set<number>(),
      };
      entry.stations += 1;
      entry.systems.add(Number(record.solarSystemID));
      counts.set(factionId, entry);
    }

    // The faction's corporations and home system are real foreign keys into
    // tables this job does not write: Corporation is ESI's, and SolarSystem is
    // ingested later in the pipeline. A reference to a row that is not there
    // yet stays null until the next run, rather than failing the whole file —
    // on a fresh database both are filled by the time `ingest-sde-all` runs
    // again. In production every one resolves.
    const referenced = (field: string) =>
      Object.values(files["factions.yaml"]).flatMap((value) => {
        const id = optionalNumber((value as Record<string, unknown>)[field]);
        return id === null ? [] : [id];
      });
    const [corporationIds, solarSystemIds] = await Promise.all([
      prisma.corporation
        .findMany({
          select: { corporationId: true },
          where: {
            corporationId: {
              in: [
                ...referenced("corporationID"),
                ...referenced("militiaCorporationID"),
              ],
            },
          },
        })
        .then((rows) => new Set(rows.map((row) => row.corporationId))),
      prisma.solarSystem
        .findMany({
          select: { solarSystemId: true },
          where: { solarSystemId: { in: referenced("solarSystemID") } },
        })
        .then((rows) => new Set(rows.map((row) => row.solarSystemId))),
    ]);

    const factions = await ingestSdeTable({
      filename: "factions.yaml",
      records: files["factions.yaml"],
      idField: "factionId",
      delegate: prisma.faction,
      toRow: (record, id): Prisma.FactionCreateManyInput => ({
        factionId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        isUnique: requiredBoolean(record.uniqueName),
        corporationId: present(
          corporationIds,
          optionalNumber(record.corporationID),
        ),
        militiaCorporationId: present(
          corporationIds,
          optionalNumber(record.militiaCorporationID),
        ),
        solarSystemId: present(
          solarSystemIds,
          optionalNumber(record.solarSystemID),
        ),
        sizeFactor: requiredNumber(record.sizeFactor),
        stationCount: counts.get(id)?.stations ?? 0,
        stationSystemCount: counts.get(id)?.systems.size ?? 0,
        flatLogo: plainString(record.flatLogo),
        flatLogoWithName: plainString(record.flatLogoWithName),
        iconId: optionalNumber(record.iconID),
        // Only the four empire factions carry a tagline.
        shortDescription: enString(record.shortDescription),
        isDeleted: false,
      }),
    });
    const memberRaces: Prisma.FactionMemberRaceCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["factions.yaml"])) {
      const factionId = Number(key);
      const races = ((value as Record<string, unknown>).memberRaces ??
        []) as number[];
      for (const raceId of races) {
        memberRaces.push({
          factionId,
          raceId: Number(raceId),
          isDeleted: false,
        });
      }
    }
    const factionMemberRaces = await ingestSdeCompositeTable({
      delegate: prisma.factionMemberRace,
      rows: memberRaces,
      keyFields: ["factionId", "raceId"],
      scopeField: "factionId",
      scopeIds: Object.keys(files["factions.yaml"]).map(Number),
    });

    return {
      stats: { factions, factionMemberRaces },
      elapsed: performance.now() - start,
    };
  },
});
