import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, optionalNumber, plainString } from "../../../helpers";

export interface IngestSdeSovereigntyUpgradesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeSovereigntyUpgrades = defineJob<
  IngestSdeSovereigntyUpgradesEventPayload["data"]
>({
  id: "ingest-sde-sovereignty-upgrades",
  name: "Ingest SDE Sovereignty Upgrades",
  description:
    "Download the SDE and ingest sovereigntyUpgrades.yaml into the SovereigntyUpgrade table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const sovereigntyUpgrades = await ingestSdeTable({
      filename: "sovereigntyUpgrades.yaml",
      idField: "typeId",
      delegate: prisma.sovereigntyUpgrade,
      toRow: (record, id): Prisma.SovereigntyUpgradeCreateManyInput => {
        const fuel = (record.fuel ?? {}) as Record<string, unknown>;
        return {
          typeId: id,
          mutuallyExclusiveGroup:
            plainString(record.mutually_exclusive_group) ?? "",
          fuelTypeId: optionalNumber(fuel.type_id),
          fuelHourlyUpkeep: optionalNumber(fuel.hourly_upkeep),
          fuelStartupCost: optionalNumber(fuel.startup_cost),
          powerAllocation: optionalNumber(record.power_allocation),
          powerProduction: optionalNumber(record.power_production),
          workforceAllocation: optionalNumber(record.workforce_allocation),
          workforceProduction: optionalNumber(record.workforce_production),
          isDeleted: false,
        };
      },
    });
    return {
      stats: { sovereigntyUpgrades },
      elapsed: performance.now() - start,
    };
  },
});
