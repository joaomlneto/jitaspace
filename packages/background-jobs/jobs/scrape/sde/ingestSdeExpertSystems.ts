import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  plainString,
  requiredBoolean,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeExpertSystemsEventPayload {
  data: Record<string, never>;
}

/**
 * expertSystems.yaml — the rentable skill packages, keyed by the item's own type
 * id. Feeds three tables: the system itself, the skills it grants and the hulls
 * it advertises. `hidden`/`retired` are kept for every record (including the QA
 * fixtures and expired promotions) so /history stays faithful; filtering to the
 * live products is the reader's job.
 */
export const ingestSdeExpertSystems = defineJob<
  IngestSdeExpertSystemsEventPayload["data"]
>({
  id: "ingest-sde-expert-systems",
  name: "Ingest SDE Expert Systems",
  description:
    "Download the SDE and ingest expertSystems.yaml into the ExpertSystem, ExpertSystemSkill and ExpertSystemShip tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("expertSystems.yaml");

    const expertSystems = await ingestSdeTable({
      filename: "expertSystems.yaml",
      idField: "typeId",
      delegate: prisma.expertSystem,
      records: data,
      toRow: (record, id): Prisma.ExpertSystemCreateManyInput => ({
        typeId: id,
        internalName: plainString(record.internalName) ?? "",
        durationDays: requiredNumber(record.durationDays),
        hidden: requiredBoolean(record.hidden),
        retired: requiredBoolean(record.retired),
        isDeleted: false,
      }),
    });

    const skills: Prisma.ExpertSystemSkillCreateManyInput[] = [];
    const ships: Prisma.ExpertSystemShipCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      const record = subRecord(value);
      const granted = record.skillsGranted;
      for (const entry of Array.isArray(granted) ? granted : []) {
        const skill = subRecord(entry);
        skills.push({
          typeId,
          skillTypeId: requiredNumber(skill.typeID),
          level: requiredNumber(skill.level),
          isDeleted: false,
        });
      }
      const shipTypes = record.associatedShipTypes;
      for (const shipTypeId of Array.isArray(shipTypes) ? shipTypes : []) {
        ships.push({
          typeId,
          shipTypeId: Number(shipTypeId),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const expertSystemSkills = await ingestSdeCompositeTable({
      delegate: prisma.expertSystemSkill,
      rows: skills,
      keyFields: ["typeId", "skillTypeId"],
      scopeField: "typeId",
      scopeIds,
    });
    const expertSystemShips = await ingestSdeCompositeTable({
      delegate: prisma.expertSystemShip,
      rows: ships,
      keyFields: ["typeId", "shipTypeId"],
      scopeField: "typeId",
      scopeIds,
    });

    return {
      stats: { expertSystems, expertSystemSkills, expertSystemShips },
      elapsed: performance.now() - start,
    };
  },
});
