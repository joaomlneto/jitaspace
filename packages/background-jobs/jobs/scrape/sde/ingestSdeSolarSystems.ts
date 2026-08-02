import Decimal from "decimal.js";

import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  nestedNumber,
  optionalNumber,
  plainString,
  requiredBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeSolarSystemsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeSolarSystems = defineJob<
  IngestSdeSolarSystemsEventPayload["data"]
>({
  id: "ingest-sde-solar-systems",
  name: "Ingest SDE Solar Systems",
  description:
    "Download the SDE and ingest mapSolarSystems.yaml into the SolarSystem table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    // `securityStatus` is a Decimal column; build it as a Decimal so the diff
    // compares like-for-like against the value Prisma returns from the DB.
    const solarSystems = await ingestSdeTable({
      filename: "mapSolarSystems.yaml",
      idField: "solarSystemId",
      delegate: prisma.solarSystem,
      toRow: (record, id): Prisma.SolarSystemCreateManyInput => ({
        solarSystemId: id,
        name: enString(record.name) ?? "",
        constellationId: requiredNumber(record.constellationID),
        securityClass: plainString(record.securityClass),
        securityStatus: new Decimal(optionalNumber(record.securityStatus) ?? 0),
        starId: optionalNumber(record.starID),
        luminosity: optionalNumber(record.luminosity),
        radius: optionalNumber(record.radius),
        positionX: nestedNumber(record.position, "x"),
        positionY: nestedNumber(record.position, "y"),
        positionZ: nestedNumber(record.position, "z"),
        wormholeClassId: optionalNumber(record.wormholeClassID),
        factionId: optionalNumber(record.factionID),
        // The SDE omits these flags entirely when false, so they are booleans
        // (not nullable) and default to false rather than null.
        border: requiredBoolean(record.border),
        corridor: requiredBoolean(record.corridor),
        fringe: requiredBoolean(record.fringe),
        hub: requiredBoolean(record.hub),
        international: requiredBoolean(record.international),
        regional: requiredBoolean(record.regional),
        isDeleted: false,
      }),
    });
    return { stats: { solarSystems }, elapsed: performance.now() - start };
  },
});
