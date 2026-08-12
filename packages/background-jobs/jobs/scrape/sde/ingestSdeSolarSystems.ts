import Decimal from "decimal.js";

import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
  requiredNumber,
  subRecord,
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
    const files = await loadSdeFiles(["mapSolarSystems.yaml"]);
    const data = files["mapSolarSystems.yaml"];

    // `securityStatus` is a Decimal column; build it as a Decimal so the diff
    // compares like-for-like against the value Prisma returns from the DB.
    const solarSystems = await ingestSdeTable({
      filename: "mapSolarSystems.yaml",
      records: data,
      idField: "solarSystemId",
      delegate: prisma.solarSystem,
      toRow: (record, id): Prisma.SolarSystemCreateManyInput => {
        const position2d = subRecord(record.position2D);
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
          position2dX: optionalNumber(position2d.x),
          position2dY: optionalNumber(position2d.y),
          isDeleted: false,
        };
      },
    });

    const anchorCategories: Prisma.SolarSystemDisallowedAnchorCategoryCreateManyInput[] =
      [];
    const anchorGroups: Prisma.SolarSystemDisallowedAnchorGroupCreateManyInput[] =
      [];
    for (const [key, value] of Object.entries(data)) {
      const solarSystemId = Number(key);
      const record = value as {
        disallowedAnchorCategories?: number[];
        disallowedAnchorGroups?: number[];
      };
      for (const categoryId of record.disallowedAnchorCategories ?? []) {
        anchorCategories.push({
          solarSystemId,
          categoryId: Number(categoryId),
          isDeleted: false,
        });
      }
      for (const groupId of record.disallowedAnchorGroups ?? []) {
        anchorGroups.push({
          solarSystemId,
          groupId: Number(groupId),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const disallowedAnchorCategories = await ingestSdeCompositeTable({
      delegate: prisma.solarSystemDisallowedAnchorCategory,
      rows: anchorCategories,
      keyFields: ["solarSystemId", "categoryId"],
      scopeField: "solarSystemId",
      scopeIds,
    });
    const disallowedAnchorGroups = await ingestSdeCompositeTable({
      delegate: prisma.solarSystemDisallowedAnchorGroup,
      rows: anchorGroups,
      keyFields: ["solarSystemId", "groupId"],
      scopeField: "solarSystemId",
      scopeIds,
    });

    return {
      stats: {
        solarSystems,
        disallowedAnchorCategories,
        disallowedAnchorGroups,
      },
      elapsed: performance.now() - start,
    };
  },
});
