import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeControlTowerResourcesEventPayload {
  data: Record<string, never>;
}

interface ControlTowerResourceBody {
  purpose: number;
  quantity: number;
  resourceTypeID: number;
  factionID?: number;
  minSecurityLevel?: number;
}

/**
 * controlTowerResources.yaml maps a control tower (POS) type to its fuel/
 * resource requirement list. A `resourceTypeID` can repeat across factions, so
 * the row order (`sequence`) is part of the key.
 */
export const ingestSdeControlTowerResources = defineJob<
  IngestSdeControlTowerResourcesEventPayload["data"]
>({
  id: "ingest-sde-control-tower-resources",
  name: "Ingest SDE Control Tower Resources",
  description:
    "Download the SDE and ingest controlTowerResources.yaml into the ControlTowerResource table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["controlTowerResources.yaml"]);
    const data = files["controlTowerResources.yaml"];

    const rows: Prisma.ControlTowerResourceCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const controlTowerTypeId = Number(key);
      const resources = (value as { resources?: ControlTowerResourceBody[] })
        .resources;
      (resources ?? []).forEach((resource, sequence) => {
        rows.push({
          controlTowerTypeId,
          sequence,
          purpose: requiredNumber(resource.purpose),
          quantity: requiredNumber(resource.quantity),
          resourceTypeId: requiredNumber(resource.resourceTypeID),
          factionId: optionalNumber(resource.factionID),
          minSecurityLevel: optionalNumber(resource.minSecurityLevel),
          isDeleted: false,
        });
      });
    }

    const controlTowerResources = await ingestSdeCompositeTable({
      delegate: prisma.controlTowerResource,
      rows,
      keyFields: ["controlTowerTypeId", "sequence"],
      scopeField: "controlTowerTypeId",
      scopeIds: Object.keys(data).map(Number),
    });
    return {
      stats: { controlTowerResources },
      elapsed: performance.now() - start,
    };
  },
});
