import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  optionalNumber,
  plainString,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeIndustryActivitiesEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeIndustryTargetFiltersEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeIndustryAssemblyLinesEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeIndustryInstallationTypesEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeIndustryModifierSourcesEventPayload {
  data: Record<string, never>;
}

/**
 * industryActivities.yaml — the numeric activity ids the rest of the industry
 * files reference. `name`/`description` are plain developer strings here, not
 * localized maps.
 */
export const ingestSdeIndustryActivities = defineJob<
  IngestSdeIndustryActivitiesEventPayload["data"]
>({
  id: "ingest-sde-industry-activities",
  name: "Ingest SDE Industry Activities",
  description:
    "Download the SDE and ingest industryActivities.yaml into the IndustryActivity table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const industryActivities = await ingestSdeTable({
      filename: "industryActivities.yaml",
      idField: "industryActivityId",
      delegate: prisma.industryActivity,
      toRow: (record, id): Prisma.IndustryActivityCreateManyInput => ({
        industryActivityId: id,
        name: plainString(record.name) ?? "",
        description: plainString(record.description) ?? "",
        isDeleted: false,
      }),
    });
    return {
      stats: { industryActivities },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * industryTargetFilters.yaml — the named group/category sets an industry bonus
 * can be restricted to.
 */
export const ingestSdeIndustryTargetFilters = defineJob<
  IngestSdeIndustryTargetFiltersEventPayload["data"]
>({
  id: "ingest-sde-industry-target-filters",
  name: "Ingest SDE Industry Target Filters",
  description:
    "Download the SDE and ingest industryTargetFilters.yaml into the IndustryTargetFilter tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("industryTargetFilters.yaml");

    const industryTargetFilters = await ingestSdeTable({
      filename: "industryTargetFilters.yaml",
      idField: "industryTargetFilterId",
      delegate: prisma.industryTargetFilter,
      records: data,
      toRow: (record, id): Prisma.IndustryTargetFilterCreateManyInput => ({
        industryTargetFilterId: id,
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });

    const groups: Prisma.IndustryTargetFilterGroupCreateManyInput[] = [];
    const categories: Prisma.IndustryTargetFilterCategoryCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const industryTargetFilterId = Number(key);
      const record = subRecord(value);
      const groupIds = record.groupIDs;
      for (const groupId of Array.isArray(groupIds) ? groupIds : []) {
        groups.push({
          industryTargetFilterId,
          groupId: Number(groupId),
          isDeleted: false,
        });
      }
      const categoryIds = record.categoryIDs;
      for (const categoryId of Array.isArray(categoryIds) ? categoryIds : []) {
        categories.push({
          industryTargetFilterId,
          categoryId: Number(categoryId),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const industryTargetFilterGroups = await ingestSdeCompositeTable({
      delegate: prisma.industryTargetFilterGroup,
      rows: groups,
      keyFields: ["industryTargetFilterId", "groupId"],
      scopeField: "industryTargetFilterId",
      scopeIds,
    });
    const industryTargetFilterCategories = await ingestSdeCompositeTable({
      delegate: prisma.industryTargetFilterCategory,
      rows: categories,
      keyFields: ["industryTargetFilterId", "categoryId"],
      scopeField: "industryTargetFilterId",
      scopeIds,
    });

    return {
      stats: {
        industryTargetFilters,
        industryTargetFilterGroups,
        industryTargetFilterCategories,
      },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * industryAssemblyLines.yaml — the production slot classes and their
 * multipliers, plus the per-group / per-category / per-type-list overrides.
 */
export const ingestSdeIndustryAssemblyLines = defineJob<
  IngestSdeIndustryAssemblyLinesEventPayload["data"]
>({
  id: "ingest-sde-industry-assembly-lines",
  name: "Ingest SDE Industry Assembly Lines",
  description:
    "Download the SDE and ingest industryAssemblyLines.yaml into the IndustryAssemblyLine tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("industryAssemblyLines.yaml");

    const industryAssemblyLines = await ingestSdeTable({
      filename: "industryAssemblyLines.yaml",
      idField: "industryAssemblyLineId",
      delegate: prisma.industryAssemblyLine,
      records: data,
      toRow: (record, id): Prisma.IndustryAssemblyLineCreateManyInput => ({
        industryAssemblyLineId: id,
        name: plainString(record.name) ?? "",
        description: plainString(record.description),
        industryActivityId: requiredNumber(record.activityID),
        baseMaterialMultiplier: requiredNumber(record.baseMaterialMultiplier),
        baseTimeMultiplier: requiredNumber(record.baseTimeMultiplier),
        baseCostMultiplier: optionalNumber(record.baseCostMultiplier),
        isDeleted: false,
      }),
    });

    const groups: Prisma.IndustryAssemblyLineGroupCreateManyInput[] = [];
    const categories: Prisma.IndustryAssemblyLineCategoryCreateManyInput[] = [];
    const typeLists: Prisma.IndustryAssemblyLineTypeListCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const industryAssemblyLineId = Number(key);
      const record = subRecord(value);
      const perGroup = record.detailsPerGroup;
      for (const entry of Array.isArray(perGroup) ? perGroup : []) {
        const detail = subRecord(entry);
        groups.push({
          industryAssemblyLineId,
          groupId: requiredNumber(detail.groupID),
          materialMultiplier: requiredNumber(detail.materialMultiplier),
          timeMultiplier: requiredNumber(detail.timeMultiplier),
          costMultiplier: optionalNumber(detail.costMultiplier),
          isDeleted: false,
        });
      }
      const perCategory = record.detailsPerCategory;
      for (const entry of Array.isArray(perCategory) ? perCategory : []) {
        const detail = subRecord(entry);
        categories.push({
          industryAssemblyLineId,
          categoryId: requiredNumber(detail.categoryID),
          materialMultiplier: requiredNumber(detail.materialMultiplier),
          timeMultiplier: requiredNumber(detail.timeMultiplier),
          costMultiplier: optionalNumber(detail.costMultiplier),
          isDeleted: false,
        });
      }
      const perTypeList = record.detailsPerTypeList;
      for (const entry of Array.isArray(perTypeList) ? perTypeList : []) {
        const detail = subRecord(entry);
        typeLists.push({
          industryAssemblyLineId,
          typeListId: requiredNumber(detail.typeListID),
          materialMultiplier: requiredNumber(detail.materialMultiplier),
          timeMultiplier: requiredNumber(detail.timeMultiplier),
          costMultiplier: optionalNumber(detail.costMultiplier),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const industryAssemblyLineGroups = await ingestSdeCompositeTable({
      delegate: prisma.industryAssemblyLineGroup,
      rows: groups,
      keyFields: ["industryAssemblyLineId", "groupId"],
      scopeField: "industryAssemblyLineId",
      scopeIds,
    });
    const industryAssemblyLineCategories = await ingestSdeCompositeTable({
      delegate: prisma.industryAssemblyLineCategory,
      rows: categories,
      keyFields: ["industryAssemblyLineId", "categoryId"],
      scopeField: "industryAssemblyLineId",
      scopeIds,
    });
    const industryAssemblyLineTypeLists = await ingestSdeCompositeTable({
      delegate: prisma.industryAssemblyLineTypeList,
      rows: typeLists,
      keyFields: ["industryAssemblyLineId", "typeListId"],
      scopeField: "industryAssemblyLineId",
      scopeIds,
    });

    return {
      stats: {
        industryAssemblyLines,
        industryAssemblyLineGroups,
        industryAssemblyLineCategories,
        industryAssemblyLineTypeLists,
      },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * industryInstallationTypes.yaml — which assembly lines a structure or ship
 * offers. The file carries nothing but the pairing, so it feeds one join table.
 */
export const ingestSdeIndustryInstallationTypes = defineJob<
  IngestSdeIndustryInstallationTypesEventPayload["data"]
>({
  id: "ingest-sde-industry-installation-types",
  name: "Ingest SDE Industry Installation Types",
  description:
    "Download the SDE and ingest industryInstallationTypes.yaml into the IndustryInstallationAssemblyLine table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("industryInstallationTypes.yaml");

    const rows: Prisma.IndustryInstallationAssemblyLineCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      const lines = subRecord(value).assemblyLines;
      for (const entry of Array.isArray(lines) ? lines : []) {
        rows.push({
          typeId,
          industryAssemblyLineId: requiredNumber(
            subRecord(entry).assemblyLineID,
          ),
          isDeleted: false,
        });
      }
    }

    const industryInstallationAssemblyLines = await ingestSdeCompositeTable({
      delegate: prisma.industryInstallationAssemblyLine,
      rows,
      keyFields: ["typeId", "industryAssemblyLineId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { industryInstallationAssemblyLines },
      elapsed: performance.now() - start,
    };
  },
});

// The activity keys industryModifierSources.yaml uses. They are camelCase here
// and snake_case in blueprints.yaml, so this list is deliberately NOT the
// `BlueprintActivityType` one — both mirror their own file's strings verbatim.
const MODIFIER_ACTIVITIES = [
  "copying",
  "invention",
  "manufacturing",
  "reaction",
  "researchMaterial",
  "researchTime",
] as const;
type ModifierActivity = (typeof MODIFIER_ACTIVITIES)[number];
const isModifierActivity = (name: string): name is ModifierActivity =>
  (MODIFIER_ACTIVITIES as readonly string[]).includes(name);

const MODIFIER_BUCKETS = ["cost", "material", "time"] as const;
type ModifierBucket = (typeof MODIFIER_BUCKETS)[number];
const isModifierBucket = (name: string): name is ModifierBucket =>
  (MODIFIER_BUCKETS as readonly string[]).includes(name);

/**
 * industryModifierSources.yaml — the dogma attributes that move a job's cost,
 * material or time figure, per activity. Records nest
 * `activity -> bucket -> [{ dogmaAttributeID, filterID? }]`; an unknown activity
 * or bucket key is skipped rather than failing the run, so a new one CCP adds
 * lands as missing data instead of a red job.
 */
export const ingestSdeIndustryModifierSources = defineJob<
  IngestSdeIndustryModifierSourcesEventPayload["data"]
>({
  id: "ingest-sde-industry-modifier-sources",
  name: "Ingest SDE Industry Modifier Sources",
  description:
    "Download the SDE and ingest industryModifierSources.yaml into the IndustryModifierSource table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("industryModifierSources.yaml");

    const rows: Prisma.IndustryModifierSourceCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      for (const [activity, byBucket] of Object.entries(subRecord(value))) {
        if (!isModifierActivity(activity)) continue;
        for (const [bucket, entries] of Object.entries(subRecord(byBucket))) {
          if (!isModifierBucket(bucket)) continue;
          for (const entry of Array.isArray(entries) ? entries : []) {
            const modifier = subRecord(entry);
            rows.push({
              typeId,
              activity,
              bucket,
              dogmaAttributeId: requiredNumber(modifier.dogmaAttributeID),
              // 0 = no filter: the id is part of the primary key, so it cannot
              // be null (see the model doc).
              industryTargetFilterId: optionalNumber(modifier.filterID) ?? 0,
              isDeleted: false,
            });
          }
        }
      }
    }

    const industryModifierSources = await ingestSdeCompositeTable({
      delegate: prisma.industryModifierSource,
      rows,
      keyFields: ["typeId", "activity", "bucket", "dogmaAttributeId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { industryModifierSources },
      elapsed: performance.now() - start,
    };
  },
});
