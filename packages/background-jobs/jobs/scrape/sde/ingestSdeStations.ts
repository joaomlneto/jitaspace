import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFiles,
  moonNames,
  optionalNumber,
  planetNames,
  requiredBoolean,
  requiredNumber,
  solarSystemNames,
  subRecord,
} from "../../../helpers";

export interface IngestSdeStationsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeStations = defineJob<
  IngestSdeStationsEventPayload["data"]
>({
  id: "ingest-sde-stations",
  name: "Ingest SDE Stations",
  description:
    "Download the SDE and ingest npcStations.yaml into the Station table. The name is derived from the orbited celestial + owner corp + operation; maxDockableShipVolume/officeRentalCost are ESI-only and left unset.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "mapSolarSystems.yaml",
      "mapPlanets.yaml",
      "mapMoons.yaml",
      "npcStations.yaml",
      "npcCorporations.yaml",
      "stationOperations.yaml",
    ]);

    // A station's orbitName is the moon or planet it orbits — or, rarely, the
    // system itself (e.g. Zarzakh, whose station orbits no planet/moon).
    const systemNames = solarSystemNames(files["mapSolarSystems.yaml"]);
    const planetNameById = planetNames(files["mapPlanets.yaml"], systemNames);
    const moonNameById = moonNames(files["mapMoons.yaml"], planetNameById);

    const corpName = new Map<number, string>();
    for (const [corporationId, corporation] of Object.entries(
      files["npcCorporations.yaml"],
    )) {
      corpName.set(
        Number(corporationId),
        enString((corporation as Record<string, unknown>).name) ?? "",
      );
    }
    const operationName = new Map<number, string>();
    for (const [operationId, operation] of Object.entries(
      files["stationOperations.yaml"],
    )) {
      operationName.set(
        Number(operationId),
        enString((operation as Record<string, unknown>).operationName) ?? "",
      );
    }

    const stations = await ingestSdeTable({
      filename: "npcStations.yaml",
      records: files["npcStations.yaml"],
      idField: "stationId",
      delegate: prisma.station,
      // ownerId / raceId and the now-nullable maxDockableShipVolume /
      // officeRentalCost are left to the ESI station scraper.
      toRow: (record, id): Prisma.StationCreateManyInput => {
        const orbitId = requiredNumber(record.orbitID);
        const operationId = requiredNumber(record.operationID);
        const orbitName =
          moonNameById.get(orbitId) ??
          planetNameById.get(orbitId) ??
          systemNames.get(requiredNumber(record.solarSystemID)) ??
          "";
        const corp = corpName.get(requiredNumber(record.ownerID)) ?? "";
        const operation = operationName.get(operationId) ?? "";
        const name = requiredBoolean(record.useOperationName)
          ? `${orbitName} - ${corp} ${operation}`
          : `${orbitName} - ${corp}`;
        // In-system coordinates, flattened into three columns as
        // ingestSdeSolarSystems does with the galactic `position`.
        const position = subRecord(record.position);
        return {
          stationId: id,
          name,
          solarSystemId: optionalNumber(record.solarSystemID),
          typeId: requiredNumber(record.typeID),
          reprocessingEfficiency: requiredNumber(record.reprocessingEfficiency),
          reprocessingStationsTake: requiredNumber(
            record.reprocessingStationsTake,
          ),
          reprocessingHangarFlag: optionalNumber(record.reprocessingHangarFlag),
          // Plain ids, not relations. `operationId` and `orbitId` are the two
          // the name above is derived from, now kept so callers can resolve the
          // StationOperation and the orbited celestial themselves. Every
          // operationID resolves in stationOperations.yaml; orbitID is a moon
          // (3,986), a planet (1,223) or — for Zarzakh alone — a star.
          operationId,
          orbitId,
          positionX: optionalNumber(position.x),
          positionY: optionalNumber(position.y),
          positionZ: optionalNumber(position.z),
          isDeleted: false,
        };
      },
    });
    return { stats: { stations }, elapsed: performance.now() - start };
  },
});
