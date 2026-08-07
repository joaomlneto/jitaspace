import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  plainString,
} from "../../../helpers";
import { elementEntries, preReqSkillEntries } from "./shipTreeTransforms";

export interface IngestSdeShipTreeEventPayload {
  data: Record<string, never>;
}

interface ElementsRecord {
  elements?: Record<string, unknown>;
}

interface PreReqSkillsRecord {
  preReqSkills?: Record<
    string,
    { skills?: Record<string, { level?: number; display?: boolean }> }
  >;
}

/**
 * shipTreeElements.yaml — the attribute rows (Armor, Shield, …) the in-game ship
 * tree shows for a hull. Leaf table with no children; every `elements` map in the
 * sibling files is guarded against it.
 */
export const ingestSdeShipTreeElements = defineJob<
  IngestSdeShipTreeEventPayload["data"]
>({
  id: "ingest-sde-ship-tree-elements",
  name: "Ingest SDE Ship Tree Elements",
  description:
    "Download the SDE and ingest shipTreeElements.yaml into the ShipTreeElement table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const shipTreeElements = await ingestSdeTable({
      filename: "shipTreeElements.yaml",
      idField: "shipTreeElementId",
      delegate: prisma.shipTreeElement,
      toRow: (record, id): Prisma.ShipTreeElementCreateManyInput => ({
        shipTreeElementId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description),
        icon: plainString(record.icon),
        isDeleted: false,
      }),
    });
    return { stats: { shipTreeElements }, elapsed: performance.now() - start };
  },
});

/**
 * shipTreeFactions.yaml — keyed by faction id, with an ordered `elements` map
 * (`slot -> shipTreeElementID`) captured as ShipTreeFactionElement rows.
 */
export const ingestSdeShipTreeFactions = defineJob<
  IngestSdeShipTreeEventPayload["data"]
>({
  id: "ingest-sde-ship-tree-factions",
  name: "Ingest SDE Ship Tree Factions",
  description:
    "Download the SDE and ingest shipTreeFactions.yaml into the ShipTreeFaction and ShipTreeFactionElement tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["shipTreeFactions.yaml"]);
    const data = files["shipTreeFactions.yaml"];
    const elementIds = await loadSdeFileIds("shipTreeElements.yaml");

    const shipTreeFactions = await ingestSdeTable({
      filename: "shipTreeFactions.yaml",
      records: data,
      idField: "factionId",
      delegate: prisma.shipTreeFaction,
      toRow: (record, id): Prisma.ShipTreeFactionCreateManyInput => ({
        factionId: id,
        description: enString(record.description),
        icon: plainString(record.icon),
        isDeleted: false,
      }),
    });

    const elements: Prisma.ShipTreeFactionElementCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const factionId = Number(key);
      for (const entry of elementEntries(
        (value as ElementsRecord).elements,
        elementIds,
      )) {
        elements.push({ factionId, ...entry, isDeleted: false });
      }
    }

    const shipTreeFactionElements = await ingestSdeCompositeTable({
      delegate: prisma.shipTreeFactionElement,
      rows: elements,
      keyFields: ["factionId", "slot"],
      scopeField: "factionId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { shipTreeFactions, shipTreeFactionElements },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * shipTreeGroups.yaml — the ship-tree group `Type.shipTreeGroupId` foreign-keys,
 * so this runs before ingest-sde-types. Also captures its ordered `elements` map
 * and the per-faction `preReqSkills` tree.
 */
export const ingestSdeShipTreeGroups = defineJob<
  IngestSdeShipTreeEventPayload["data"]
>({
  id: "ingest-sde-ship-tree-groups",
  name: "Ingest SDE Ship Tree Groups",
  description:
    "Download the SDE and ingest shipTreeGroups.yaml into the ShipTreeGroup, ShipTreeGroupElement and ShipTreeGroupPreReqSkill tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["shipTreeGroups.yaml"]);
    const data = files["shipTreeGroups.yaml"];
    const elementIds = await loadSdeFileIds("shipTreeElements.yaml");

    const shipTreeGroups = await ingestSdeTable({
      filename: "shipTreeGroups.yaml",
      records: data,
      idField: "shipTreeGroupId",
      delegate: prisma.shipTreeGroup,
      toRow: (record, id): Prisma.ShipTreeGroupCreateManyInput => ({
        shipTreeGroupId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description),
        icon: plainString(record.icon),
        iconLarge: plainString(record.iconLarge),
        iconSmall: plainString(record.iconSmall),
        iconSmallNpc: plainString(record.iconSmallNPC),
        isDeleted: false,
      }),
    });

    const elements: Prisma.ShipTreeGroupElementCreateManyInput[] = [];
    const preReqSkills: Prisma.ShipTreeGroupPreReqSkillCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const shipTreeGroupId = Number(key);
      for (const entry of elementEntries(
        (value as ElementsRecord).elements,
        elementIds,
      )) {
        elements.push({ shipTreeGroupId, ...entry, isDeleted: false });
      }
      for (const entry of preReqSkillEntries(
        (value as PreReqSkillsRecord).preReqSkills,
      )) {
        preReqSkills.push({ shipTreeGroupId, ...entry, isDeleted: false });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const shipTreeGroupElements = await ingestSdeCompositeTable({
      delegate: prisma.shipTreeGroupElement,
      rows: elements,
      keyFields: ["shipTreeGroupId", "slot"],
      scopeField: "shipTreeGroupId",
      scopeIds,
    });
    const shipTreeGroupPreReqSkills = await ingestSdeCompositeTable({
      delegate: prisma.shipTreeGroupPreReqSkill,
      rows: preReqSkills,
      keyFields: ["shipTreeGroupId", "factionId", "skillTypeId"],
      scopeField: "shipTreeGroupId",
      scopeIds,
    });

    return {
      stats: {
        shipTreeGroups,
        shipTreeGroupElements,
        shipTreeGroupPreReqSkills,
      },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * typeElements.yaml — the ship-tree elements shown for a specific type. Keyed by
 * typeID with the same ordered `elements` map shape as the group/faction files.
 */
export const ingestSdeTypeElements = defineJob<
  IngestSdeShipTreeEventPayload["data"]
>({
  id: "ingest-sde-type-elements",
  name: "Ingest SDE Type Elements",
  description:
    "Download the SDE and ingest typeElements.yaml into the TypeElement table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["typeElements.yaml"]);
    const data = files["typeElements.yaml"];
    const elementIds = await loadSdeFileIds("shipTreeElements.yaml");

    const rows: Prisma.TypeElementCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      for (const entry of elementEntries(
        (value as ElementsRecord).elements,
        elementIds,
      )) {
        rows.push({ typeId, ...entry, isDeleted: false });
      }
    }

    const typeElements = await ingestSdeCompositeTable({
      delegate: prisma.typeElement,
      rows,
      keyFields: ["typeId", "slot"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return { stats: { typeElements }, elapsed: performance.now() - start };
  },
});
