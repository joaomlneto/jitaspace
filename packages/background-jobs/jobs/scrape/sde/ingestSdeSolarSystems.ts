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
        wormholeClassId: optionalNumber(record.wormholeClassID),
        visualEffect: plainString(record.visualEffect),
        luminosity: optionalNumber(record.luminosity),
        radius: optionalNumber(record.radius),
        positionX: nestedNumber(record.position, "x"),
        positionY: nestedNumber(record.position, "y"),
        positionZ: nestedNumber(record.position, "z"),
        factionId: optionalNumber(record.factionID),
        // The SDE omits each traffic flag when it is false, so an absent key
        // means false rather than unknown.
        isBorder: requiredBoolean(record.border),
        isCorridor: requiredBoolean(record.corridor),
        isFringe: requiredBoolean(record.fringe),
        isHub: requiredBoolean(record.hub),
        isRegional: requiredBoolean(record.regional),
        isInternational: requiredBoolean(record.international),
        isDeleted: false,
      }),
    });
    return { stats: { solarSystems }, elapsed: performance.now() - start };
  },
});
