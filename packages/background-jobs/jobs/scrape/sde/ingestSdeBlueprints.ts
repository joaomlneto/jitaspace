import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeBlueprintsEventPayload {
  data: Record<string, never>;
}

interface BlueprintActivityBody {
  time?: number;
  materials?: { typeID: number; quantity: number }[];
  products?: { typeID: number; quantity: number; probability?: number }[];
  skills?: { typeID: number; level: number }[];
}
interface BlueprintRecord {
  maxProductionLimit?: number;
  activities?: Record<string, BlueprintActivityBody>;
}

const ACTIVITY_TYPES = [
  "copying",
  "invention",
  "manufacturing",
  "reaction",
  "research_material",
  "research_time",
] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];
const isActivity = (name: string): name is ActivityType =>
  (ACTIVITY_TYPES as readonly string[]).includes(name);

/** Map the `{ typeID, … }` entries whose type is real, dropping dangling refs. */
function guardedRows<T extends { typeID: number }, R>(
  items: T[] | undefined,
  typeIds: Set<number>,
  toRow: (item: T) => R,
): R[] {
  return (items ?? []).filter((item) => typeIds.has(item.typeID)).map(toRow);
}

export const ingestSdeBlueprints = defineJob<
  IngestSdeBlueprintsEventPayload["data"]
>({
  id: "ingest-sde-blueprints",
  name: "Ingest SDE Blueprints",
  description:
    "Download the SDE and ingest blueprints.yaml into the Blueprint tables (activity, materials, products, skills).",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["blueprints.yaml", "types.yaml"]);
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));

    const blueprints: Prisma.BlueprintCreateManyInput[] = [];
    const activities: Prisma.BlueprintActivityCreateManyInput[] = [];
    const materials: Prisma.BlueprintMaterialCreateManyInput[] = [];
    const products: Prisma.BlueprintProductCreateManyInput[] = [];
    const skills: Prisma.BlueprintSkillCreateManyInput[] = [];

    for (const [key, value] of Object.entries(files["blueprints.yaml"])) {
      const blueprintTypeId = Number(key);
      // The blueprint itself must be a real Type; skip dangling refs throughout.
      if (!typeIds.has(blueprintTypeId)) continue;
      const record = value as BlueprintRecord;
      blueprints.push({
        blueprintTypeId,
        maxProductionLimit: requiredNumber(record.maxProductionLimit),
        isDeleted: false,
      });
      for (const [name, body] of Object.entries(record.activities ?? {})) {
        if (!isActivity(name)) continue;
        activities.push({
          blueprintTypeId,
          activity: name,
          time: requiredNumber(body.time),
          isDeleted: false,
        });
        materials.push(
          ...guardedRows(body.materials, typeIds, (m) => ({
            blueprintTypeId,
            activity: name,
            materialTypeId: m.typeID,
            quantity: requiredNumber(m.quantity),
            isDeleted: false,
          })),
        );
        products.push(
          ...guardedRows(body.products, typeIds, (p) => ({
            blueprintTypeId,
            activity: name,
            productTypeId: p.typeID,
            quantity: requiredNumber(p.quantity),
            probability: optionalNumber(p.probability),
            isDeleted: false,
          })),
        );
        skills.push(
          ...guardedRows(body.skills, typeIds, (s) => ({
            blueprintTypeId,
            activity: name,
            skillTypeId: s.typeID,
            level: requiredNumber(s.level),
            isDeleted: false,
          })),
        );
      }
    }

    const scopeIds = blueprints.map((blueprint) => blueprint.blueprintTypeId);

    // FK order: Blueprint → BlueprintActivity → materials/products/skills.
    const blueprintStats = await ingestSdeCompositeTable({
      delegate: prisma.blueprint,
      rows: blueprints,
      keyFields: ["blueprintTypeId"],
      scopeField: "blueprintTypeId",
      scopeIds,
    });
    const activityStats = await ingestSdeCompositeTable({
      delegate: prisma.blueprintActivity,
      rows: activities,
      keyFields: ["blueprintTypeId", "activity"],
      scopeField: "blueprintTypeId",
      scopeIds,
    });
    const materialStats = await ingestSdeCompositeTable({
      delegate: prisma.blueprintMaterial,
      rows: materials,
      keyFields: ["blueprintTypeId", "activity", "materialTypeId"],
      scopeField: "blueprintTypeId",
      scopeIds,
    });
    const productStats = await ingestSdeCompositeTable({
      delegate: prisma.blueprintProduct,
      rows: products,
      keyFields: ["blueprintTypeId", "activity", "productTypeId"],
      scopeField: "blueprintTypeId",
      scopeIds,
    });
    const skillStats = await ingestSdeCompositeTable({
      delegate: prisma.blueprintSkill,
      rows: skills,
      keyFields: ["blueprintTypeId", "activity", "skillTypeId"],
      scopeField: "blueprintTypeId",
      scopeIds,
    });

    return {
      stats: {
        blueprints: blueprintStats,
        activities: activityStats,
        materials: materialStats,
        products: productStats,
        skills: skillStats,
      },
      elapsed: performance.now() - start,
    };
  },
});
