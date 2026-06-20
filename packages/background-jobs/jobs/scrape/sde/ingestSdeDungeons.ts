import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeDungeonsEventPayload {
  data: Record<string, never>;
}

interface DungeonRecord {
  allowedShipsList?: number[];
}

/**
 * dungeons.yaml defines encounter/dungeon sites. Feeds Dungeon (name,
 * descriptions, archetype, faction) and DungeonAllowedShip (`allowedShipsList`).
 */
export const ingestSdeDungeons = defineJob<
  IngestSdeDungeonsEventPayload["data"]
>({
  id: "ingest-sde-dungeons",
  name: "Ingest SDE Dungeons",
  description:
    "Download the SDE and ingest dungeons.yaml into the Dungeon and DungeonAllowedShip tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["dungeons.yaml"]);
    const data = files["dungeons.yaml"];

    const dungeons = await ingestSdeTable({
      filename: "dungeons.yaml",
      idField: "dungeonId",
      delegate: prisma.dungeon,
      records: data,
      toRow: (record, id): Prisma.DungeonCreateManyInput => ({
        dungeonId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description),
        gameplayDescription: enString(record.gameplayDescription),
        archetypeId: requiredNumber(record.archetypeID),
        factionId: optionalNumber(record.factionID),
        isDeleted: false,
      }),
    });

    const allowedShips: Prisma.DungeonAllowedShipCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const dungeonId = Number(key);
      const record = value as DungeonRecord;
      for (const shipTypeId of record.allowedShipsList ?? []) {
        allowedShips.push({ dungeonId, shipTypeId, isDeleted: false });
      }
    }

    const dungeonAllowedShips = await ingestSdeCompositeTable({
      delegate: prisma.dungeonAllowedShip,
      rows: allowedShips,
      keyFields: ["dungeonId", "shipTypeId"],
      scopeField: "dungeonId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { dungeons, dungeonAllowedShips },
      elapsed: performance.now() - start,
    };
  },
});
