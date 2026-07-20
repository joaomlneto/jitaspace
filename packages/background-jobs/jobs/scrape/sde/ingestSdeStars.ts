import Decimal from "decimal.js";

import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  plainString,
  requiredBigInt,
  requiredNumber,
  solarSystemNames,
} from "../../../helpers";

export interface IngestSdeStarsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeStars = defineJob<IngestSdeStarsEventPayload["data"]>({
  id: "ingest-sde-stars",
  name: "Ingest SDE Stars",
  description:
    "Download the SDE and ingest mapStars.yaml into the Star table (name = the solar system name).",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["mapSolarSystems.yaml", "mapStars.yaml"]);
    const systemNames = solarSystemNames(files["mapSolarSystems.yaml"]);

    const stars = await ingestSdeTable({
      filename: "mapStars.yaml",
      records: files["mapStars.yaml"],
      idField: "starId",
      delegate: prisma.star,
      toRow: (record, id): Prisma.StarCreateManyInput => {
        const stats = (record.statistics ?? {}) as Record<string, unknown>;
        const solarSystemId = requiredNumber(record.solarSystemID);
        return {
          starId: id,
          name: systemNames.get(solarSystemId) ?? "",
          solarSystemId,
          typeId: requiredNumber(record.typeID),
          radius: requiredBigInt(record.radius),
          age: requiredBigInt(stats.age),
          luminosity: new Decimal(optionalNumber(stats.luminosity) ?? 0),
          spectralClass: plainString(stats.spectralClass) ?? "",
          temperature: requiredBigInt(stats.temperature),
          isDeleted: false,
        };
      },
    });
    return { stats: { stars }, elapsed: performance.now() - start };
  },
});
