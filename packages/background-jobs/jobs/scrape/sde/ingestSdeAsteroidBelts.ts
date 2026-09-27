import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  asteroidBeltNames,
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
    "Download the SDE and ingest mapAsteroidBelts.yaml into the AsteroidBelt table (name = its uniqueName, else '<planet> - Asteroid Belt <orbitIndex>'; planetId = orbitID).",
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
    // Through the shared helper, not an inline template: a named asteroid belt keeps
    // its `uniqueName`, which need not follow the "<planet> - Asteroid Belt <n>" pattern.
    const beltNameById = asteroidBeltNames(
      files["mapAsteroidBelts.yaml"],
      planetNameById,
    );

    const asteroidBelts = await ingestSdeTable({
      filename: "mapAsteroidBelts.yaml",
      records: files["mapAsteroidBelts.yaml"],
      idField: "asteroidBeltId",
      delegate: prisma.asteroidBelt,
      toRow: (record, id): Prisma.AsteroidBeltCreateManyInput => {
        // An asteroid belt orbits its planet, so orbitID is the parent planetId.
        const planetId = requiredNumber(record.orbitID);
        // The 702 belts CCP ships without `radius`/`statistics` read as null.
        const position = subRecord(record.position);
        const stats = subRecord(record.statistics);
        return {
          asteroidBeltId: id,
          name: beltNameById.get(id) ?? "",
          planetId,
          typeId: optionalNumber(record.typeID),
          radius: optionalNumber(record.radius),
          solarSystemId: optionalNumber(record.solarSystemID),
          celestialIndex: optionalNumber(record.celestialIndex),
          orbitIndex: optionalNumber(record.orbitIndex),
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
