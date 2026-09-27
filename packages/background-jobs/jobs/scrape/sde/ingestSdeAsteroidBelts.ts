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

export interface IngestSdeAsteroidBeltsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeAsteroidBelts = defineJob<
  IngestSdeAsteroidBeltsEventPayload["data"]
>({
  id: "ingest-sde-asteroid-belts",
  name: "Ingest SDE Asteroid Belts",
  description:
    "Download the SDE and ingest mapAsteroidBelts.yaml into the AsteroidBelt table (name = '<planet> - Asteroid Belt <orbitIndex>'; planetId = orbitID).",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "mapSolarSystems.yaml",
      "mapPlanets.yaml",
      "mapAsteroidBelts.yaml",
    ]);
    const planetNameById = planetNames(
      files["mapPlanets.yaml"],
      solarSystemNames(files["mapSolarSystems.yaml"]),
    );

    const asteroidBelts = await ingestSdeTable({
      filename: "mapAsteroidBelts.yaml",
      records: files["mapAsteroidBelts.yaml"],
      idField: "asteroidBeltId",
      delegate: prisma.asteroidBelt,
      toRow: (record, id): Prisma.AsteroidBeltCreateManyInput => {
        // An asteroid belt orbits its planet, so orbitID is the parent planetId.
        const planetId = requiredNumber(record.orbitID);
        const planet = planetNameById.get(planetId) ?? "";
        // The 702 belts CCP ships without `radius`/`statistics` read as null.
        const position = subRecord(record.position);
        const stats = subRecord(record.statistics);
        return {
          asteroidBeltId: id,
          name: `${planet} - Asteroid Belt ${requiredNumber(record.orbitIndex)}`,
          planetId,
          typeId: optionalNumber(record.typeID),
          radius: optionalNumber(record.radius),
          solarSystemId: optionalNumber(record.solarSystemID),
          celestialIndex: optionalNumber(record.celestialIndex),
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
          rotationRate: optionalNumber(stats.rotationRate),
          surfaceGravity: optionalNumber(stats.surfaceGravity),
          temperature: optionalNumber(stats.temperature),
          spectralClass: plainString(stats.spectralClass),
          isDeleted: false,
        };
      },
    });
    return { stats: { asteroidBelts }, elapsed: performance.now() - start };
  },
});
