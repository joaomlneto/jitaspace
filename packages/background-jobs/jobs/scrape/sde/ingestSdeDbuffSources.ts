import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  optionalNumber,
  requiredBoolean,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeAppliedProximityEffectsEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeProximityTrapEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeSystemDbuffEmittersEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeSystemWideEffectsEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeLinkWithShipEventPayload {
  data: Record<string, never>;
}

/**
 * Five SDE files attach a `{ dbuffCollectionID -> value }` map to a type. Each
 * gets its own child table rather than one shared polymorphic one: they are all
 * keyed by `typeId`, so a shared table could not be soft-deleted correctly —
 * `ingestSdeCompositeTable` scopes its diff by a single field, and a job scoped
 * on `typeId` would see another source's rows for the same type as deleted.
 *
 * Flatten the map into `{ dbuffCollectionId, value }` pairs. The map is absent on
 * some records, which reads as no rows.
 */
function dbuffRows(
  value: unknown,
): { dbuffCollectionId: number; value: number }[] {
  return Object.entries(subRecord(subRecord(value).dbuffs)).map(
    ([dbuffCollectionId, dbuffValue]) => ({
      dbuffCollectionId: Number(dbuffCollectionId),
      value: Number(dbuffValue),
    }),
  );
}

/**
 * appliedProximityEffects.yaml — the dbuffs a deployed type projects onto
 * everything inside `radius`, after `delaySeconds`.
 */
export const ingestSdeAppliedProximityEffects = defineJob<
  IngestSdeAppliedProximityEffectsEventPayload["data"]
>({
  id: "ingest-sde-applied-proximity-effects",
  name: "Ingest SDE Applied Proximity Effects",
  description:
    "Download the SDE and ingest appliedProximityEffects.yaml into the AppliedProximityEffect tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("appliedProximityEffects.yaml");

    const appliedProximityEffects = await ingestSdeTable({
      filename: "appliedProximityEffects.yaml",
      idField: "typeId",
      delegate: prisma.appliedProximityEffect,
      records: data,
      toRow: (record, id): Prisma.AppliedProximityEffectCreateManyInput => ({
        typeId: id,
        delaySeconds: requiredNumber(record.delaySeconds),
        radius: requiredNumber(record.radius),
        isDeleted: false,
      }),
    });

    const rows: Prisma.AppliedProximityEffectDbuffCreateManyInput[] =
      Object.entries(data).flatMap(([key, value]) =>
        dbuffRows(value).map((dbuff) => ({
          typeId: Number(key),
          ...dbuff,
          isDeleted: false,
        })),
      );
    const appliedProximityEffectDbuffs = await ingestSdeCompositeTable({
      delegate: prisma.appliedProximityEffectDbuff,
      rows,
      keyFields: ["typeId", "dbuffCollectionId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { appliedProximityEffects, appliedProximityEffectDbuffs },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * proximityTrap.yaml — trap deployables: what sets them off
 * (`triggerFilterTypeListId` points at `TypeList`), how far, and what they apply.
 */
export const ingestSdeProximityTrap = defineJob<
  IngestSdeProximityTrapEventPayload["data"]
>({
  id: "ingest-sde-proximity-trap",
  name: "Ingest SDE Proximity Traps",
  description:
    "Download the SDE and ingest proximityTrap.yaml into the ProximityTrap tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("proximityTrap.yaml");

    const proximityTraps = await ingestSdeTable({
      filename: "proximityTrap.yaml",
      idField: "typeId",
      delegate: prisma.proximityTrap,
      records: data,
      toRow: (record, id): Prisma.ProximityTrapCreateManyInput => ({
        typeId: id,
        dbuffDuration: requiredNumber(record.dbuffDuration),
        forceDecloakDuration: optionalNumber(record.forceDecloakDuration),
        resetDelay: optionalNumber(record.resetDelay),
        showPerimeterLights: requiredBoolean(record.showPerimeterLights),
        triggerDelay: requiredNumber(record.triggerDelay),
        triggerFilterTypeListId: requiredNumber(record.triggerFilterTypeListID),
        triggerRange: requiredNumber(record.triggerRange),
        isDeleted: false,
      }),
    });

    const rows: Prisma.ProximityTrapDbuffCreateManyInput[] = Object.entries(
      data,
    ).flatMap(([key, value]) =>
      dbuffRows(value).map((dbuff) => ({
        typeId: Number(key),
        ...dbuff,
        isDeleted: false,
      })),
    );
    const proximityTrapDbuffs = await ingestSdeCompositeTable({
      delegate: prisma.proximityTrapDbuff,
      rows,
      keyFields: ["typeId", "dbuffCollectionId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { proximityTraps, proximityTrapDbuffs },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * systemDbuffEmitters.yaml — structures that re-apply dbuffs across a system on
 * an interval.
 */
export const ingestSdeSystemDbuffEmitters = defineJob<
  IngestSdeSystemDbuffEmittersEventPayload["data"]
>({
  id: "ingest-sde-system-dbuff-emitters",
  name: "Ingest SDE System Dbuff Emitters",
  description:
    "Download the SDE and ingest systemDbuffEmitters.yaml into the SystemDbuffEmitter tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("systemDbuffEmitters.yaml");

    const systemDbuffEmitters = await ingestSdeTable({
      filename: "systemDbuffEmitters.yaml",
      idField: "typeId",
      delegate: prisma.systemDbuffEmitter,
      records: data,
      toRow: (record, id): Prisma.SystemDbuffEmitterCreateManyInput => ({
        typeId: id,
        duration: requiredNumber(record.duration),
        interval: requiredNumber(record.interval),
        excludeProtected: requiredBoolean(record.excludeProtected),
        isDeleted: false,
      }),
    });

    const rows: Prisma.SystemDbuffEmitterDbuffCreateManyInput[] =
      Object.entries(data).flatMap(([key, value]) =>
        dbuffRows(value).map((dbuff) => ({
          typeId: Number(key),
          ...dbuff,
          isDeleted: false,
        })),
      );
    const systemDbuffEmitterDbuffs = await ingestSdeCompositeTable({
      delegate: prisma.systemDbuffEmitterDbuff,
      rows,
      keyFields: ["typeId", "dbuffCollectionId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { systemDbuffEmitters, systemDbuffEmitterDbuffs },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * systemWideEffects.yaml — the wormhole / Pochven-style environment beacons,
 * keyed by the beacon's own type id. `eligibleTypeListId` points at `TypeList`.
 */
export const ingestSdeSystemWideEffects = defineJob<
  IngestSdeSystemWideEffectsEventPayload["data"]
>({
  id: "ingest-sde-system-wide-effects",
  name: "Ingest SDE System Wide Effects",
  description:
    "Download the SDE and ingest systemWideEffects.yaml into the SystemWideEffect tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("systemWideEffects.yaml");

    const systemWideEffects = await ingestSdeTable({
      filename: "systemWideEffects.yaml",
      idField: "typeId",
      delegate: prisma.systemWideEffect,
      records: data,
      toRow: (record, id): Prisma.SystemWideEffectCreateManyInput => ({
        typeId: id,
        eligibleTypeListId: optionalNumber(record.eligibleTypeListID),
        environmentTypeId: optionalNumber(record.environmentTypeID),
        isDeleted: false,
      }),
    });

    const rows: Prisma.SystemWideEffectDbuffCreateManyInput[] = Object.entries(
      data,
    ).flatMap(([key, value]) =>
      dbuffRows(value).map((dbuff) => ({
        typeId: Number(key),
        ...dbuff,
        isDeleted: false,
      })),
    );
    const systemWideEffectDbuffs = await ingestSdeCompositeTable({
      delegate: prisma.systemWideEffectDbuff,
      rows,
      keyFields: ["typeId", "dbuffCollectionId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { systemWideEffects, systemWideEffectDbuffs },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * linkWithShip.yaml — the ship-linking config (duration, range, energy cost) and
 * the dbuffs the link applies while it holds.
 */
export const ingestSdeLinkWithShip = defineJob<
  IngestSdeLinkWithShipEventPayload["data"]
>({
  id: "ingest-sde-link-with-ship",
  name: "Ingest SDE Link With Ship",
  description:
    "Download the SDE and ingest linkWithShip.yaml into the LinkWithShip tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("linkWithShip.yaml");

    const linkWithShips = await ingestSdeTable({
      filename: "linkWithShip.yaml",
      idField: "typeId",
      delegate: prisma.linkWithShip,
      records: data,
      toRow: (record, id): Prisma.LinkWithShipCreateManyInput => ({
        typeId: id,
        applyPvpFlag: requiredBoolean(record.applyPvpFlag),
        canRelink: requiredBoolean(record.canRelink),
        characterEnergyCost: optionalNumber(record.characterEnergyCost),
        dbuffPostLinkDuration: requiredNumber(record.dbuffPostLinkDuration),
        generateCynoInhibitor: requiredBoolean(record.generateCynoInhibitor),
        keepDbuffDurationOnLinkBreak: requiredBoolean(
          record.keepDbuffDurationOnLinkBreak,
        ),
        linkDuration: requiredNumber(record.linkDuration),
        linkEffectGraphicIdOverride: requiredNumber(
          record.linkEffectGraphicIDOverride,
        ),
        linkableShipTypeListId: requiredNumber(record.linkableShipTypeListID),
        maxLinkRange: requiredNumber(record.maxLinkRange),
        omegaOnly: requiredBoolean(record.omegaOnly),
        // CCP's key is lowercase `solarsystem`; the column normalises it.
        solarSystemInterferenceCost: optionalNumber(
          record.solarsystemInterferenceCost,
        ),
        isDeleted: false,
      }),
    });

    const rows: Prisma.LinkWithShipDbuffCreateManyInput[] = Object.entries(
      data,
    ).flatMap(([key, value]) =>
      dbuffRows(value).map((dbuff) => ({
        typeId: Number(key),
        ...dbuff,
        isDeleted: false,
      })),
    );
    const linkWithShipDbuffs = await ingestSdeCompositeTable({
      delegate: prisma.linkWithShipDbuff,
      rows,
      keyFields: ["typeId", "dbuffCollectionId"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { linkWithShips, linkWithShipDbuffs },
      elapsed: performance.now() - start,
    };
  },
});
