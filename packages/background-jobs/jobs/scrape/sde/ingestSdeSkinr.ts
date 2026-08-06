import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeSkinrEventPayload {
  data: Record<string, never>;
}

/**
 * SKINR — the in-game SKIN designer. Nine small reference files; the order in
 * SDE_INGEST_JOB_IDS matters because point values and components FK at the
 * category/rarity tables, slot configurations FK at slots, and tier thresholds
 * FK at ShipTreeGroup.
 */

/** skinrComponentCategories.yaml — Material / Pattern / Metallic. */
export const ingestSdeSkinrComponentCategories = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-component-categories",
  name: "Ingest SDE SKINR Component Categories",
  description:
    "Download the SDE and ingest skinrComponentCategories.yaml into the SkinrComponentCategory table.",
  handler: async () => {
    const start = performance.now();
    const skinrComponentCategories = await ingestSdeTable({
      filename: "skinrComponentCategories.yaml",
      idField: "skinrComponentCategoryId",
      delegate: prisma.skinrComponentCategory,
      toRow: (record, id): Prisma.SkinrComponentCategoryCreateManyInput => ({
        skinrComponentCategoryId: id,
        // A plain internal identifier here, not a localized string.
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });
    return {
      stats: { skinrComponentCategories },
      elapsed: performance.now() - start,
    };
  },
});

/** skinrComponentRarities.yaml — Standard … and their sort rank. */
export const ingestSdeSkinrComponentRarities = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-component-rarities",
  name: "Ingest SDE SKINR Component Rarities",
  description:
    "Download the SDE and ingest skinrComponentRarities.yaml into the SkinrComponentRarity table.",
  handler: async () => {
    const start = performance.now();
    const skinrComponentRarities = await ingestSdeTable({
      filename: "skinrComponentRarities.yaml",
      idField: "skinrComponentRarityId",
      delegate: prisma.skinrComponentRarity,
      toRow: (record, id): Prisma.SkinrComponentRarityCreateManyInput => ({
        skinrComponentRarityId: id,
        name: enString(record.name) ?? "",
        rank: optionalNumber(record.rank),
        isDeleted: false,
      }),
    });
    return {
      stats: { skinrComponentRarities },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * skinrComponentPointValues.yaml — a bare `rarity -> points` map keyed by
 * component category, so the record has no fields of its own.
 */
export const ingestSdeSkinrComponentPointValues = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-component-point-values",
  name: "Ingest SDE SKINR Component Point Values",
  description:
    "Download the SDE and ingest skinrComponentPointValues.yaml into the SkinrComponentPointValue table.",
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinrComponentPointValues.yaml",
      "skinrComponentCategories.yaml",
      "skinrComponentRarities.yaml",
    ]);
    const data = files["skinrComponentPointValues.yaml"];
    const categoryIds = new Set(
      Object.keys(files["skinrComponentCategories.yaml"]).map(Number),
    );
    const rarityIds = new Set(
      Object.keys(files["skinrComponentRarities.yaml"]).map(Number),
    );

    const rows: Prisma.SkinrComponentPointValueCreateManyInput[] = [];
    for (const [categoryKey, value] of Object.entries(data)) {
      const skinrComponentCategoryId = Number(categoryKey);
      if (!categoryIds.has(skinrComponentCategoryId)) continue;
      for (const [rarityKey, points] of Object.entries(
        value as Record<string, number>,
      )) {
        const skinrComponentRarityId = Number(rarityKey);
        if (!rarityIds.has(skinrComponentRarityId)) continue;
        rows.push({
          skinrComponentCategoryId,
          skinrComponentRarityId,
          points: requiredNumber(points),
          isDeleted: false,
        });
      }
    }

    const skinrComponentPointValues = await ingestSdeCompositeTable({
      delegate: prisma.skinrComponentPointValue,
      rows,
      keyFields: ["skinrComponentCategoryId", "skinrComponentRarityId"],
      scopeField: "skinrComponentCategoryId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { skinrComponentPointValues },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * skinrComponents.yaml — the materials and patterns themselves. `sequenceBinder`
 * is flattened; `associatedTypeIds[]` becomes SkinrComponentType. Components
 * whose category or rarity is missing upstream are skipped, which also drops
 * their associated-type rows.
 */
export const ingestSdeSkinrComponents = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-components",
  name: "Ingest SDE SKINR Components",
  description:
    "Download the SDE and ingest skinrComponents.yaml into the SkinrComponent and SkinrComponentType tables.",
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinrComponents.yaml",
      "skinrComponentCategories.yaml",
      "skinrComponentRarities.yaml",
    ]);
    const data = files["skinrComponents.yaml"];
    const categoryIds = new Set(
      Object.keys(files["skinrComponentCategories.yaml"]).map(Number),
    );
    const rarityIds = new Set(
      Object.keys(files["skinrComponentRarities.yaml"]).map(Number),
    );

    const components: Prisma.SkinrComponentCreateManyInput[] = [];
    const componentTypes: Prisma.SkinrComponentTypeCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const skinrComponentId = Number(key);
      const record = value as Record<string, unknown>;
      const categoryId = requiredNumber(record.category);
      const rarityId = requiredNumber(record.rarity);
      if (!categoryIds.has(categoryId) || !rarityIds.has(rarityId)) continue;
      const binder = (record.sequenceBinder ?? {}) as Record<string, unknown>;
      components.push({
        skinrComponentId,
        name: enString(record.name) ?? "",
        skinrComponentCategoryId: categoryId,
        skinrComponentRarityId: rarityId,
        published: optionalBoolean(record.published),
        finish: plainString(record.finish),
        iconFile: plainString(record.iconFile),
        resourceFile: plainString(record.resourceFile),
        projectionTypeU: plainString(record.projectionTypeU),
        projectionTypeV: plainString(record.projectionTypeV),
        sequenceBinderItemTypeId: optionalNumber(binder.itemTypeID),
        sequenceBinderCount: optionalNumber(binder.count),
        isDeleted: false,
      });
      const associated = (record.associatedTypeIds ?? []) as {
        typeID?: number;
        licenseUsesGranted?: number;
      }[];
      for (const entry of associated) {
        if (entry.typeID == null) continue;
        componentTypes.push({
          skinrComponentId,
          typeId: Number(entry.typeID),
          licenseUsesGranted: optionalNumber(entry.licenseUsesGranted),
          isDeleted: false,
        });
      }
    }

    const scopeIds = components.map((c) => c.skinrComponentId);
    const skinrComponents = await ingestSdeCompositeTable({
      delegate: prisma.skinrComponent,
      rows: components,
      keyFields: ["skinrComponentId"],
      scopeField: "skinrComponentId",
      scopeIds,
    });
    const skinrComponentTypes = await ingestSdeCompositeTable({
      delegate: prisma.skinrComponentType,
      rows: componentTypes,
      keyFields: ["skinrComponentId", "typeId"],
      scopeField: "skinrComponentId",
      scopeIds,
    });

    return {
      stats: { skinrComponents, skinrComponentTypes },
      elapsed: performance.now() - start,
    };
  },
});

/** skinrSlotCategories.yaml — Material_slot / Pattern_slot / … */
export const ingestSdeSkinrSlotCategories = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-slot-categories",
  name: "Ingest SDE SKINR Slot Categories",
  description:
    "Download the SDE and ingest skinrSlotCategories.yaml into the SkinrSlotCategory table.",
  handler: async () => {
    const start = performance.now();
    const skinrSlotCategories = await ingestSdeTable({
      filename: "skinrSlotCategories.yaml",
      idField: "skinrSlotCategoryId",
      delegate: prisma.skinrSlotCategory,
      toRow: (record, id): Prisma.SkinrSlotCategoryCreateManyInput => ({
        skinrSlotCategoryId: id,
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });
    return {
      stats: { skinrSlotCategories },
      elapsed: performance.now() - start,
    };
  },
});

/** skinrSlotNames.yaml — internal slot names such as `primary_nanocoating`. */
export const ingestSdeSkinrSlotNames = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-slot-names",
  name: "Ingest SDE SKINR Slot Names",
  description:
    "Download the SDE and ingest skinrSlotNames.yaml into the SkinrSlotName table.",
  handler: async () => {
    const start = performance.now();
    const skinrSlotNames = await ingestSdeTable({
      filename: "skinrSlotNames.yaml",
      idField: "skinrSlotNameId",
      delegate: prisma.skinrSlotName,
      toRow: (record, id): Prisma.SkinrSlotNameCreateManyInput => ({
        skinrSlotNameId: id,
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });
    return { stats: { skinrSlotNames }, elapsed: performance.now() - start };
  },
});

/**
 * skinrSlots.yaml — the designer slots, plus the component categories each slot
 * accepts (`allowedDesignComponentCategories[]`).
 */
export const ingestSdeSkinrSlots = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-slots",
  name: "Ingest SDE SKINR Slots",
  description:
    "Download the SDE and ingest skinrSlots.yaml into the SkinrSlot and SkinrSlotAllowedCategory tables.",
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinrSlots.yaml",
      "skinrSlotCategories.yaml",
    ]);
    const data = files["skinrSlots.yaml"];
    const categoryIds = new Set(
      Object.keys(files["skinrSlotCategories.yaml"]).map(Number),
    );

    const skinrSlots = await ingestSdeTable({
      filename: "skinrSlots.yaml",
      records: data,
      idField: "skinrSlotId",
      delegate: prisma.skinrSlot,
      toRow: (record, id): Prisma.SkinrSlotCreateManyInput => {
        const categoryId = optionalNumber(record.category);
        return {
          skinrSlotId: id,
          name: enString(record.name) ?? "",
          skinrSlotCategoryId:
            categoryId != null && categoryIds.has(categoryId)
              ? categoryId
              : null,
          isDeleted: false,
        };
      },
    });

    const allowed: Prisma.SkinrSlotAllowedCategoryCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const skinrSlotId = Number(key);
      const categories = ((value as Record<string, unknown>)
        .allowedDesignComponentCategories ?? []) as number[];
      for (const skinrComponentCategoryId of categories) {
        allowed.push({
          skinrSlotId,
          skinrComponentCategoryId: Number(skinrComponentCategoryId),
          isDeleted: false,
        });
      }
    }

    const skinrSlotAllowedCategories = await ingestSdeCompositeTable({
      delegate: prisma.skinrSlotAllowedCategory,
      rows: allowed,
      keyFields: ["skinrSlotId", "skinrComponentCategoryId"],
      scopeField: "skinrSlotId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { skinrSlots, skinrSlotAllowedCategories },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * skinrSlotConfigurations.yaml — which slots a hull exposes. `config[]` is the
 * slot list (FK at SkinrSlot, so this runs after ingest-sde-skinr-slots) and
 * `ships[]` the hulls it applies to; `allowAllShips` configurations list none.
 */
export const ingestSdeSkinrSlotConfigurations = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-slot-configurations",
  name: "Ingest SDE SKINR Slot Configurations",
  description:
    "Download the SDE and ingest skinrSlotConfigurations.yaml into the SkinrSlotConfiguration, SkinrSlotConfigurationSlot and SkinrSlotConfigurationShip tables.",
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinrSlotConfigurations.yaml",
      "skinrSlots.yaml",
    ]);
    const data = files["skinrSlotConfigurations.yaml"];
    const slotIds = new Set(Object.keys(files["skinrSlots.yaml"]).map(Number));

    const skinrSlotConfigurations = await ingestSdeTable({
      filename: "skinrSlotConfigurations.yaml",
      records: data,
      idField: "skinrSlotConfigurationId",
      delegate: prisma.skinrSlotConfiguration,
      toRow: (record, id): Prisma.SkinrSlotConfigurationCreateManyInput => ({
        skinrSlotConfigurationId: id,
        name: plainString(record.name) ?? "",
        priority: optionalNumber(record.priority),
        allowAllShips: optionalBoolean(record.allowAllShips),
        isDeleted: false,
      }),
    });

    const slots: Prisma.SkinrSlotConfigurationSlotCreateManyInput[] = [];
    const ships: Prisma.SkinrSlotConfigurationShipCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const skinrSlotConfigurationId = Number(key);
      const record = value as Record<string, unknown>;
      for (const slotId of (record.config ?? []) as number[]) {
        const skinrSlotId = Number(slotId);
        if (!slotIds.has(skinrSlotId)) continue;
        slots.push({
          skinrSlotConfigurationId,
          skinrSlotId,
          isDeleted: false,
        });
      }
      for (const typeId of (record.ships ?? []) as number[]) {
        ships.push({
          skinrSlotConfigurationId,
          typeId: Number(typeId),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const skinrSlotConfigurationSlots = await ingestSdeCompositeTable({
      delegate: prisma.skinrSlotConfigurationSlot,
      rows: slots,
      keyFields: ["skinrSlotConfigurationId", "skinrSlotId"],
      scopeField: "skinrSlotConfigurationId",
      scopeIds,
    });
    const skinrSlotConfigurationShips = await ingestSdeCompositeTable({
      delegate: prisma.skinrSlotConfigurationShip,
      rows: ships,
      keyFields: ["skinrSlotConfigurationId", "typeId"],
      scopeField: "skinrSlotConfigurationId",
      scopeIds,
    });

    return {
      stats: {
        skinrSlotConfigurations,
        skinrSlotConfigurationSlots,
        skinrSlotConfigurationShips,
      },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * skinrTierThresholds.yaml — a bare `tier -> points` map keyed by
 * shipTreeGroupID, so it FKs at ShipTreeGroup and runs after
 * ingest-sde-ship-tree-groups.
 */
export const ingestSdeSkinrTierThresholds = defineJob<
  IngestSdeSkinrEventPayload["data"]
>({
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  id: "ingest-sde-skinr-tier-thresholds",
  name: "Ingest SDE SKINR Tier Thresholds",
  description:
    "Download the SDE and ingest skinrTierThresholds.yaml into the SkinrTierThreshold table.",
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinrTierThresholds.yaml",
      "shipTreeGroups.yaml",
    ]);
    const data = files["skinrTierThresholds.yaml"];
    const groupIds = new Set(
      Object.keys(files["shipTreeGroups.yaml"]).map(Number),
    );

    const rows: Prisma.SkinrTierThresholdCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const shipTreeGroupId = Number(key);
      if (!groupIds.has(shipTreeGroupId)) continue;
      for (const [tier, points] of Object.entries(
        value as Record<string, number>,
      )) {
        rows.push({
          shipTreeGroupId,
          tier: Number(tier),
          points: requiredNumber(points),
          isDeleted: false,
        });
      }
    }

    const skinrTierThresholds = await ingestSdeCompositeTable({
      delegate: prisma.skinrTierThreshold,
      rows,
      keyFields: ["shipTreeGroupId", "tier"],
      scopeField: "shipTreeGroupId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { skinrTierThresholds },
      elapsed: performance.now() - start,
    };
  },
});
