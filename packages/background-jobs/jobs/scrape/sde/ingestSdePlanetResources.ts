import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, optionalNumber } from "../../../helpers";

export interface IngestSdePlanetResourcesEventPayload {
  data: Record<string, never>;
}

/**
 * planetResources.yaml maps a planet to its colony resource — each planet
 * provides exactly one of `power`, `workforce`, or a `reagent` (flattened into
 * the reagent* columns).
 */
export const ingestSdePlanetResources = defineJob<
  IngestSdePlanetResourcesEventPayload["data"]
>({
  id: "ingest-sde-planet-resources",
  name: "Ingest SDE Planet Resources",
  description:
    "Download the SDE and ingest planetResources.yaml into the PlanetResource table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const planetResources = await ingestSdeTable({
      filename: "planetResources.yaml",
      idField: "planetId",
      delegate: prisma.planetResource,
      toRow: (record, id): Prisma.PlanetResourceCreateManyInput => {
        const reagent = (record.reagent ?? {}) as Record<string, unknown>;
        return {
          planetId: id,
          power: optionalNumber(record.power),
          workforce: optionalNumber(record.workforce),
          reagentTypeId: optionalNumber(reagent.type_id),
          reagentAmountPerCycle: optionalNumber(reagent.amount_per_cycle),
          reagentCyclePeriod: optionalNumber(reagent.cycle_period),
          reagentSecuredCapacity: optionalNumber(reagent.secured_capacity),
          reagentUnsecuredCapacity: optionalNumber(reagent.unsecured_capacity),
          isDeleted: false,
        };
      },
    });
    return { stats: { planetResources }, elapsed: performance.now() - start };
  },
});
