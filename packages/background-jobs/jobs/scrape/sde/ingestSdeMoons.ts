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

export interface IngestSdeMoonsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeMoons = defineJob<IngestSdeMoonsEventPayload["data"]>({
  id: "ingest-sde-moons",
  name: "Ingest SDE Moons",
  description:
    "Download the SDE and ingest mapMoons.yaml into the Moon table (name = '<planet> - Moon <orbitIndex>'; planetId = orbitID).",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "mapSolarSystems.yaml",
      "mapPlanets.yaml",
      "mapMoons.yaml",
    ]);
    const planetNameById = planetNames(
      files["mapPlanets.yaml"],
      solarSystemNames(files["mapSolarSystems.yaml"]),
    );

    const moons = await ingestSdeTable({
      filename: "mapMoons.yaml",
      records: files["mapMoons.yaml"],
      idField: "moonId",
      delegate: prisma.moon,
      toRow: (record, id): Prisma.MoonCreateManyInput => {
        // A moon orbits its planet, so orbitID is the parent planetId.
        const planetId = requiredNumber(record.orbitID);
        const planet = planetNameById.get(planetId) ?? "";
        return {
          moonId: id,
          name: `${planet} - Moon ${requiredNumber(record.orbitIndex)}`,
          planetId,
          isDeleted: false,
        };
      },
    });
    return { stats: { moons }, elapsed: performance.now() - start };
  },
});
