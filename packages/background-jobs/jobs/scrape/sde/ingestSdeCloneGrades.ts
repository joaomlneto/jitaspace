import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  plainString,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeCloneGradesEventPayload {
  data: Record<string, never>;
}

interface CloneGradeRecord {
  skills?: { level: number; typeID: number }[];
}

/**
 * cloneGrades.yaml defines the Alpha-clone skill caps. Feeds CloneGrade (the
 * grade name) and CloneGradeSkill (the per-skill level cap).
 */
export const ingestSdeCloneGrades = defineJob<
  IngestSdeCloneGradesEventPayload["data"]
>({
  id: "ingest-sde-clone-grades",
  name: "Ingest SDE Clone Grades",
  description:
    "Download the SDE and ingest cloneGrades.yaml into the CloneGrade and CloneGradeSkill tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["cloneGrades.yaml"]);
    const data = files["cloneGrades.yaml"];

    const cloneGrades = await ingestSdeTable({
      filename: "cloneGrades.yaml",
      idField: "cloneGradeId",
      delegate: prisma.cloneGrade,
      records: data,
      toRow: (record, id): Prisma.CloneGradeCreateManyInput => ({
        cloneGradeId: id,
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });

    const skills: Prisma.CloneGradeSkillCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const cloneGradeId = Number(key);
      const record = value as CloneGradeRecord;
      for (const skill of record.skills ?? []) {
        skills.push({
          cloneGradeId,
          skillTypeId: requiredNumber(skill.typeID),
          level: requiredNumber(skill.level),
          isDeleted: false,
        });
      }
    }

    const cloneGradeSkills = await ingestSdeCompositeTable({
      delegate: prisma.cloneGradeSkill,
      rows: skills,
      keyFields: ["cloneGradeId", "skillTypeId"],
      scopeField: "cloneGradeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { cloneGrades, cloneGradeSkills },
      elapsed: performance.now() - start,
    };
  },
});
