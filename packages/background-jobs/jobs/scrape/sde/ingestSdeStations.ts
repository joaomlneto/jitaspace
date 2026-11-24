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
  present,
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
    "Download the SDE and ingest npcStations.yaml into the Station table. The name is derived from the orbited celestial + owner corp + operation; Owner and race (its type's) are set too; maxDockableShipVolume/officeRentalCost were ESI-only and are left as they are.",
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

    // Owner and race are real foreign keys. The owner is an NPC corporation —
    // an ESI-scraped table — and a station's race is its station type's race,
    // which is what ESI reported (all 61 stations sampled on 2026-11-24). Both
    // are read back from the database, where `ingest-sde-types` and
    // `ingest-sde-races` have already written them; a reference to a row that
    // is not there yet stays null until the next run.
    const records = Object.values(files["npcStations.yaml"]).map(
      (value) => value as Record<string, unknown>,
    );
    const [ownerIds, typeRaces, raceIds] = await Promise.all([
      prisma.corporation
        .findMany({
          select: { corporationId: true },
          where: {
            corporationId: {
              in: records.map((record) => requiredNumber(record.ownerID)),
            },
          },
        })
        .then((rows) => new Set(rows.map((row) => row.corporationId))),
      prisma.type
        .findMany({
          select: { typeId: true, raceId: true },
          where: {
            typeId: {
              in: [
                ...new Set(
                  records.map((record) => requiredNumber(record.typeID)),
                ),
              ],
            },
          },
        })
        .then((rows) => new Map(rows.map((row) => [row.typeId, row.raceId]))),
      prisma.race
        .findMany({ select: { raceId: true } })
        .then((rows) => new Set(rows.map((row) => row.raceId))),
    ]);

    const stations = await ingestSdeTable({
      filename: "npcStations.yaml",
      records: files["npcStations.yaml"],
      idField: "stationId",
      delegate: prisma.station,
      // maxDockableShipVolume and officeRentalCost are not in the SDE. ESI was
      // their only source and no longer serves stations, so this job leaves
      // them alone: existing rows keep ESI's last value, new ones stay null.
      toRow: (record, id): Prisma.StationCreateManyInput => {
        const typeId = requiredNumber(record.typeID);
        const raceId = typeRaces.get(typeId) ?? null;
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
          typeId,
          ownerId: present(ownerIds, requiredNumber(record.ownerID)),
          raceId: present(raceIds, raceId),
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
