import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
} from "../../../helpers";
import {
  toMissionExtraStandingRows,
  toMissionMessageRows,
  toMissionRow,
} from "./missionTransforms";

export interface IngestSdeMissionsEventPayload {
  data: Record<string, never>;
}

interface MissionRecord {
  messages?: Record<string, unknown>;
  extraStandings?: Record<string, number>;
}

/**
 * missions.yaml — agent missions, plus the `messages` and `extraStandings` child
 * tables. Every field-level transform lives in ./missionTransforms so it can be
 * unit-tested without mocking p-limit and the env.
 *
 * Runs before ingest-sde-epic-arcs, which foreign-keys EpicArcMission.missionId
 * at Mission.
 */
export const ingestSdeMissions = defineJob<
  IngestSdeMissionsEventPayload["data"]
>({
  id: "ingest-sde-missions",
  name: "Ingest SDE Missions",
  description:
    "Download the SDE and ingest missions.yaml into the Mission, MissionMessage and MissionExtraStanding tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["missions.yaml"]);
    const data = files["missions.yaml"];

    const missions = await ingestSdeTable({
      filename: "missions.yaml",
      records: data,
      idField: "missionId",
      delegate: prisma.mission,
      toRow: (record, id): Prisma.MissionCreateManyInput =>
        toMissionRow(id, record),
    });

    const messages: Prisma.MissionMessageCreateManyInput[] = [];
    const extraStandings: Prisma.MissionExtraStandingCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const missionId = Number(key);
      const record = value as MissionRecord;
      messages.push(...toMissionMessageRows(missionId, record.messages));
      extraStandings.push(
        ...toMissionExtraStandingRows(missionId, record.extraStandings),
      );
    }

    const scopeIds = Object.keys(data).map(Number);
    const missionMessages = await ingestSdeCompositeTable({
      delegate: prisma.missionMessage,
      rows: messages,
      keyFields: ["missionId", "key"],
      scopeField: "missionId",
      scopeIds,
    });
    const missionExtraStandings = await ingestSdeCompositeTable({
      delegate: prisma.missionExtraStanding,
      rows: extraStandings,
      keyFields: ["missionId", "factionId"],
      scopeField: "missionId",
      scopeIds,
    });

    return {
      stats: { missions, missionMessages, missionExtraStandings },
      elapsed: performance.now() - start,
    };
  },
});
