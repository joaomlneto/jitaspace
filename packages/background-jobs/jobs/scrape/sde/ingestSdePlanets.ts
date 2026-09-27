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
        toRow: (record, id): Prisma.PlanetCreateManyInput => {
          const attributes = subRecord(record.attributes);
          const position = subRecord(record.position);
          const stats = subRecord(record.statistics);
          return {
            planetId: id,
            name: names.get(id) ?? "",
            solarSystemId: requiredNumber(record.solarSystemID),
            typeId: requiredNumber(record.typeID),
            heightMap1: optionalNumber(attributes.heightMap1),
            heightMap2: optionalNumber(attributes.heightMap2),
            shaderPreset: optionalNumber(attributes.shaderPreset),
            population: optionalBoolean(attributes.population),
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
      return { stats: { planets }, elapsed: performance.now() - start };
    },
  },
);
