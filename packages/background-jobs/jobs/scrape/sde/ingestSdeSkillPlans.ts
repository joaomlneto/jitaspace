import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  optionalNumber,
  plainString,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeSkillPlansEventPayload {
  data: Record<string, never>;
}

/**
 * skillPlans.yaml — the career training queues the client suggests. A plan
 * trains the same skill several times at rising levels, so a step is keyed by
 * (plan, skill, level) and `sequence` carries the queue order; milestones are
 * unique per (plan, type).
 */
export const ingestSdeSkillPlans = defineJob<
  IngestSdeSkillPlansEventPayload["data"]
>({
  id: "ingest-sde-skill-plans",
  name: "Ingest SDE Skill Plans",
  description:
    "Download the SDE and ingest skillPlans.yaml into the SkillPlan, SkillPlanSkill and SkillPlanMilestone tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("skillPlans.yaml");

    const skillPlans = await ingestSdeTable({
      filename: "skillPlans.yaml",
      idField: "skillPlanId",
      delegate: prisma.skillPlan,
      records: data,
      toRow: (record, id): Prisma.SkillPlanCreateManyInput => ({
        skillPlanId: id,
        internalName: plainString(record.internalName) ?? "",
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        careerPathId: optionalNumber(record.careerPathID),
        factionId: optionalNumber(record.factionID),
        npcCorporationDivisionId: optionalNumber(record.npcCorporationDivision),
        isDeleted: false,
      }),
    });

    const steps: Prisma.SkillPlanSkillCreateManyInput[] = [];
    const milestones: Prisma.SkillPlanMilestoneCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const skillPlanId = Number(key);
      const record = subRecord(value);
      const requirements = record.skillRequirements;
      (Array.isArray(requirements) ? requirements : []).forEach(
        (entry, sequence) => {
          const step = subRecord(entry);
          steps.push({
            skillPlanId,
            skillTypeId: requiredNumber(step.typeID),
            level: requiredNumber(step.level),
            sequence,
            isDeleted: false,
          });
        },
      );
      const planMilestones = record.milestones;
      (Array.isArray(planMilestones) ? planMilestones : []).forEach(
        (entry, sequence) => {
          const milestone = subRecord(entry);
          milestones.push({
            skillPlanId,
            typeId: requiredNumber(milestone.typeID),
            level: optionalNumber(milestone.level),
            sequence,
            isDeleted: false,
          });
        },
      );
    }

    const scopeIds = Object.keys(data).map(Number);
    const skillPlanSkills = await ingestSdeCompositeTable({
      delegate: prisma.skillPlanSkill,
      rows: steps,
      keyFields: ["skillPlanId", "skillTypeId", "level"],
      scopeField: "skillPlanId",
      scopeIds,
    });
    const skillPlanMilestones = await ingestSdeCompositeTable({
      delegate: prisma.skillPlanMilestone,
      rows: milestones,
      keyFields: ["skillPlanId", "typeId"],
      scopeField: "skillPlanId",
      scopeIds,
    });

    return {
      stats: { skillPlans, skillPlanSkills, skillPlanMilestones },
      elapsed: performance.now() - start,
    };
  },
});
