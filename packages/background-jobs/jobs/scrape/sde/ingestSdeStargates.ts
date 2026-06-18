import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
  solarSystemNames,
} from "../../../helpers";

export interface IngestSdeStargatesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeStargates = defineJob<
  IngestSdeStargatesEventPayload["data"]
>({
  id: "ingest-sde-stargates",
  name: "Ingest SDE Stargates",
  description:
    "Download the SDE and ingest mapStargates.yaml into the Stargate table (name = 'Stargate (<destination system>)').",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "mapSolarSystems.yaml",
      "mapStargates.yaml",
    ]);
    const systemNames = solarSystemNames(files["mapSolarSystems.yaml"]);

    const stargates = await ingestSdeTable({
      filename: "mapStargates.yaml",
      records: files["mapStargates.yaml"],
      idField: "stargateId",
      delegate: prisma.stargate,
      toRow: (record, id): Prisma.StargateCreateManyInput => {
        const destination = (record.destination ?? {}) as Record<
          string,
          unknown
        >;
        const destinationSystem = systemNames.get(
          requiredNumber(destination.solarSystemID),
        );
        return {
          stargateId: id,
          name: `Stargate (${destinationSystem ?? ""})`,
          solarSystemId: requiredNumber(record.solarSystemID),
          typeId: requiredNumber(record.typeID),
          destinationStargateId: optionalNumber(destination.stargateID),
          isDeleted: false,
        };
      },
    });
    return { stats: { stargates }, elapsed: performance.now() - start };
  },
});
