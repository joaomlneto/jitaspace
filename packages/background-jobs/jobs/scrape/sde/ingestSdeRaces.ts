import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeRacesEventPayload {
  data: Record<string, never>;
}

interface RaceRecord {
  /** A bare `skillTypeID -> level` map, not a list of objects. */
  skills?: Record<string, number>;
}

export const ingestSdeRaces = defineJob<IngestSdeRacesEventPayload["data"]>({
  id: "ingest-sde-races",
  name: "Ingest SDE Races",
  description:
    "Download the SDE and ingest races.yaml into the Race and RaceSkill tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["races.yaml"]);
    const data = files["races.yaml"];
    // `shipTypeID` is the race's starter ship. Guard it against types.yaml the
    // way ingestSdeTypes guards its own optional FKs.
    const typeIds = await loadSdeFileIds("types.yaml");

    // FK order: Race first, then its starting-skill children.
    // `factionId` is not set here — it is sourced from ESI, so the diff leaves
    // it untouched (races.yaml has no factionID anyway).
    const races = await ingestSdeTable({
      filename: "races.yaml",
      records: data,
      idField: "raceId",
      delegate: prisma.race,
      toRow: (record, id): Prisma.RaceCreateManyInput => {
        const shipTypeId = optionalNumber(record.shipTypeID);
        return {
          raceId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description),
          shipTypeId:
            shipTypeId != null && typeIds.has(shipTypeId) ? shipTypeId : null,
          // A plain id, not a relation — and all 5 present ones resolve in
          // icons.yaml, so no `present()` guard is warranted.
          iconId: optionalNumber(record.iconID),
          isDeleted: false,
        };
      },
    });

    // The four playable races ship a `skills` map: the skills (and levels) a
    // freshly created character of that race starts with.
    const skills: Prisma.RaceSkillCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const raceId = Number(key);
      const record = value as RaceRecord;
      for (const [skillKey, level] of Object.entries(record.skills ?? {})) {
        const skillTypeId = Number(skillKey);
        if (!typeIds.has(skillTypeId)) continue;
        skills.push({
          raceId,
          skillTypeId,
          level: requiredNumber(level),
          isDeleted: false,
        });
      }
    }

    // Scope over every race, not just the four with skills, so a race that
    // loses its map still has its rows soft-deleted.
    const raceSkills = await ingestSdeCompositeTable({
      delegate: prisma.raceSkill,
      rows: skills,
      keyFields: ["raceId", "skillTypeId"],
      scopeField: "raceId",
      scopeIds: Object.keys(data).map(Number),
    });

    return { stats: { races, raceSkills }, elapsed: performance.now() - start };
  },
});
