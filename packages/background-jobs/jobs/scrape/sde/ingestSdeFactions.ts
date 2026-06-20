import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFiles,
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

    const factions = await ingestSdeTable({
      filename: "factions.yaml",
      records: files["factions.yaml"],
      idField: "factionId",
      delegate: prisma.faction,
      // corporationId / militiaCorporationId / solarSystemId are left to the ESI
      // faction scraper — setting them would require Corporation / SolarSystem
      // rows to already exist.
      toRow: (record, id): Prisma.FactionCreateManyInput => ({
        factionId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        isUnique: requiredBoolean(record.uniqueName),
        sizeFactor: requiredNumber(record.sizeFactor),
        stationCount: counts.get(id)?.stations ?? 0,
        stationSystemCount: counts.get(id)?.systems.size ?? 0,
        isDeleted: false,
      }),
    });
    return { stats: { factions }, elapsed: performance.now() - start };
  },
});
