import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
  planetNames,
  requiredNumber,
  solarSystemNames,
  subRecord,
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
        const attributes = subRecord(record.attributes);
        // Coordinates and physical statistics are nested one level down; the
        // 1,364 moons CCP ships without a `statistics` block read as all-null.
        const position = subRecord(record.position);
        const stats = subRecord(record.statistics);
        return {
          moonId: id,
          name: `${planet} - Moon ${requiredNumber(record.orbitIndex)}`,
          planetId,
          heightMap1: optionalNumber(attributes.heightMap1),
          heightMap2: optionalNumber(attributes.heightMap2),
          shaderPreset: optionalNumber(attributes.shaderPreset),
          typeId: optionalNumber(record.typeID),
          radius: optionalNumber(record.radius),
          positionX: optionalNumber(position.x),
          positionY: optionalNumber(position.y),
          positionZ: optionalNumber(position.z),
          density: optionalNumber(stats.density),
          eccentricity: optionalNumber(stats.eccentricity),
          escapeVelocity: optionalNumber(stats.escapeVelocity),
          isTidallyLocked: optionalBoolean(stats.locked),
          massDust: optionalNumber(stats.massDust),
          massGas: optionalNumber(stats.massGas),
          orbitPeriod: optionalNumber(stats.orbitPeriod),
          orbitRadius: optionalNumber(stats.orbitRadius),
          pressure: optionalNumber(stats.pressure),
          rotationRate: optionalNumber(stats.rotationRate),
          surfaceGravity: optionalNumber(stats.surfaceGravity),
          temperature: optionalNumber(stats.temperature),
          spectralClass: plainString(stats.spectralClass),
          isDeleted: false,
        };
      },
    });
    return { stats: { moons }, elapsed: performance.now() - start };
  },
});
