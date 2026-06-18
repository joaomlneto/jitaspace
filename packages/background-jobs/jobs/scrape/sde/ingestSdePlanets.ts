import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeTable,
  loadSdeFiles,
  planetNames,
  requiredNumber,
  solarSystemNames,
} from "../../../helpers";

export interface IngestSdePlanetsEventPayload {
  data: Record<string, never>;
}

export const ingestSdePlanets = defineJob<IngestSdePlanetsEventPayload["data"]>(
  {
    id: "ingest-sde-planets",
    name: "Ingest SDE Planets",
    description:
      "Download the SDE and ingest mapPlanets.yaml into the Planet table (name = '<system> <roman celestialIndex>').",
    trigger: { type: "event" },
    singleton: true,
    maxDurationSeconds: 3600,
    handler: async () => {
      const start = performance.now();
      const files = await loadSdeFiles([
        "mapSolarSystems.yaml",
        "mapPlanets.yaml",
      ]);
      const names = planetNames(
        files["mapPlanets.yaml"],
        solarSystemNames(files["mapSolarSystems.yaml"]),
      );

      const planets = await ingestSdeTable({
        filename: "mapPlanets.yaml",
        records: files["mapPlanets.yaml"],
        idField: "planetId",
        delegate: prisma.planet,
        toRow: (record, id): Prisma.PlanetCreateManyInput => ({
          planetId: id,
          name: names.get(id) ?? "",
          solarSystemId: requiredNumber(record.solarSystemID),
          typeId: requiredNumber(record.typeID),
          isDeleted: false,
        }),
      });
      return { stats: { planets }, elapsed: performance.now() - start };
    },
  },
);
