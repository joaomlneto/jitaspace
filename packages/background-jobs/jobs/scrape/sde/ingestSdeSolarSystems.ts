import Decimal from "decimal.js";

import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
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
    const files = await loadSdeFiles(["mapSolarSystems.yaml", "factions.yaml"]);
    // `factionID` is an optional FK; guard it against factions.yaml so a system
    // referencing a faction the SDE dropped lands as null instead of failing.
    const factionIds = new Set(Object.keys(files["factions.yaml"]).map(Number));

    // `securityStatus` is a Decimal column; build it as a Decimal so the diff
    // compares like-for-like against the value Prisma returns from the DB.
    const solarSystems = await ingestSdeTable({
      filename: "mapSolarSystems.yaml",
      records: files["mapSolarSystems.yaml"],
      idField: "solarSystemId",
      delegate: prisma.solarSystem,
      toRow: (record, id): Prisma.SolarSystemCreateManyInput => {
        // The SDE nests the system's galactic coordinates under `position`;
        // they are flattened into three columns, as KillmailVictim does.
        const position = record.position as
          | { x?: unknown; y?: unknown; z?: unknown }
          | undefined;
        return {
          solarSystemId: id,
          name: enString(record.name) ?? "",
          constellationId: requiredNumber(record.constellationID),
          securityClass: plainString(record.securityClass),
          securityStatus: new Decimal(
            optionalNumber(record.securityStatus) ?? 0,
          ),
          starId: optionalNumber(record.starID),
          wormholeClassId: optionalNumber(record.wormholeClassID),
          visualEffect: plainString(record.visualEffect),
          isRegional: optionalBoolean(record.regional),
          isInternational: optionalBoolean(record.international),
          isHub: optionalBoolean(record.hub),
          isBorder: optionalBoolean(record.border),
          isFringe: optionalBoolean(record.fringe),
          isCorridor: optionalBoolean(record.corridor),
          luminosity: optionalNumber(record.luminosity),
          radius: optionalNumber(record.radius),
          positionX: optionalNumber(position?.x),
          positionY: optionalNumber(position?.y),
          positionZ: optionalNumber(position?.z),
          factionId: (() => {
            const factionId = optionalNumber(record.factionID);
            return factionId != null && factionIds.has(factionId)
              ? factionId
              : null;
          })(),
          isDeleted: false,
        };
      },
    });
    return { stats: { solarSystems }, elapsed: performance.now() - start };
  },
});
