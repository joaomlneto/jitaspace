import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  optionalBoolean,
  optionalNumber,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeSchoolsEventPayload {
  data: Record<string, never>;
}

/**
 * schools.yaml — the character-creation academies, plus their career agents and
 * starting stations. `isStarterSpaceSchool` is only set on the schools that have
 * it, so it stays nullable rather than defaulting to false.
 */
export const ingestSdeSchools = defineJob<IngestSdeSchoolsEventPayload["data"]>(
  {
    id: "ingest-sde-schools",
    name: "Ingest SDE Schools",
    description:
      "Download the SDE and ingest schools.yaml into the School, SchoolCareerAgent and SchoolStartingStation tables.",
    trigger: { type: "event" },
    singleton: true,
    maxDurationSeconds: 1800,
    handler: async () => {
      const start = performance.now();
      const data = await loadSdeFile("schools.yaml");

      const schools = await ingestSdeTable({
        filename: "schools.yaml",
        idField: "schoolId",
        delegate: prisma.school,
        records: data,
        toRow: (record, id): Prisma.SchoolCreateManyInput => ({
          schoolId: id,
          name: enString(record.name) ?? "",
          title: enString(record.title),
          description: enString(record.description),
          characterDescription: enString(record.characterDescription),
          careerId: requiredNumber(record.careerID),
          corporationId: requiredNumber(record.corporationID),
          raceId: requiredNumber(record.raceID),
          iconId: optionalNumber(record.iconID),
          isStarterSpaceSchool: optionalBoolean(record.isStarterSpaceSchool),
          isDeleted: false,
        }),
      });

      const agents: Prisma.SchoolCareerAgentCreateManyInput[] = [];
      const stations: Prisma.SchoolStartingStationCreateManyInput[] = [];
      for (const [key, value] of Object.entries(data)) {
        const schoolId = Number(key);
        const record = subRecord(value);
        const careerAgents = record.careerAgents;
        for (const agentId of Array.isArray(careerAgents) ? careerAgents : []) {
          agents.push({ schoolId, agentId: Number(agentId), isDeleted: false });
        }
        const startingStations = record.startingStations;
        for (const stationId of Array.isArray(startingStations)
          ? startingStations
          : []) {
          stations.push({
            schoolId,
            stationId: Number(stationId),
            isDeleted: false,
          });
        }
      }

      const scopeIds = Object.keys(data).map(Number);
      const schoolCareerAgents = await ingestSdeCompositeTable({
        delegate: prisma.schoolCareerAgent,
        rows: agents,
        keyFields: ["schoolId", "agentId"],
        scopeField: "schoolId",
        scopeIds,
      });
      const schoolStartingStations = await ingestSdeCompositeTable({
        delegate: prisma.schoolStartingStation,
        rows: stations,
        keyFields: ["schoolId", "stationId"],
        scopeField: "schoolId",
        scopeIds,
      });

      return {
        stats: { schools, schoolCareerAgents, schoolStartingStations },
        elapsed: performance.now() - start,
      };
    },
  },
);
