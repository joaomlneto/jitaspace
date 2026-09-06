import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFile,
  subRecord,
} from "../../../helpers";

export interface IngestSdeStationStandingsRestrictionsEventPayload {
  data: Record<string, never>;
}

/**
 * stationStandingsRestrictions.yaml — the standing a faction's stations demand
 * before granting each service. Keyed by faction id; the `services` map is
 * `stationServiceID -> standing`.
 */
export const ingestSdeStationStandingsRestrictions = defineJob<
  IngestSdeStationStandingsRestrictionsEventPayload["data"]
>({
  id: "ingest-sde-station-standings-restrictions",
  name: "Ingest SDE Station Standings Restrictions",
  description:
    "Download the SDE and ingest stationStandingsRestrictions.yaml into the StationStandingsRestriction table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("stationStandingsRestrictions.yaml");

    const rows: Prisma.StationStandingsRestrictionCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const factionId = Number(key);
      for (const [serviceId, standing] of Object.entries(
        subRecord(subRecord(value).services),
      )) {
        rows.push({
          factionId,
          stationServiceId: Number(serviceId),
          minimumStanding: Number(standing),
          isDeleted: false,
        });
      }
    }

    const stationStandingsRestrictions = await ingestSdeCompositeTable({
      delegate: prisma.stationStandingsRestriction,
      rows,
      keyFields: ["factionId", "stationServiceId"],
      scopeField: "factionId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { stationStandingsRestrictions },
      elapsed: performance.now() - start,
    };
  },
});
