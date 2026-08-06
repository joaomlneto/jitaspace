import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalNumber,
} from "../../../helpers";

export interface IngestSdeEpicArcsEventPayload {
  data: Record<string, never>;
}

interface EpicArcRecord {
  missions?: Record<
    string,
    { agentID?: number; failMissionID?: number; nextMissions?: number[] }
  >;
}

/**
 * epicArcs.yaml — branching mission chains. Each arc's `missions` map becomes
 * EpicArcMission rows, and each node's `nextMissions` array becomes the
 * EpicArcMissionNext edge table.
 *
 * EpicArcMission.missionId is a real FK at Mission, so this must run after
 * ingest-sde-missions. Nodes whose mission is absent from missions.yaml are
 * dropped, the way ingestSdeTypes guards its optional FKs.
 */
export const ingestSdeEpicArcs = defineJob<
  IngestSdeEpicArcsEventPayload["data"]
>({
  id: "ingest-sde-epic-arcs",
  name: "Ingest SDE Epic Arcs",
  description:
    "Download the SDE and ingest epicArcs.yaml into the EpicArc, EpicArcMission and EpicArcMissionNext tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["epicArcs.yaml"]);
    const data = files["epicArcs.yaml"];
    const missionIds = await loadSdeFileIds("missions.yaml");

    const epicArcs = await ingestSdeTable({
      filename: "epicArcs.yaml",
      records: data,
      idField: "epicArcId",
      delegate: prisma.epicArc,
      toRow: (record, id): Prisma.EpicArcCreateManyInput => ({
        epicArcId: id,
        name: enString(record.name) ?? "",
        factionId: optionalNumber(record.factionID),
        iconId: optionalNumber(record.iconID),
        arcRestartInterval: optionalNumber(record.arcRestartInterval),
        isDeleted: false,
      }),
    });

    const arcMissions: Prisma.EpicArcMissionCreateManyInput[] = [];
    const nextMissions: Prisma.EpicArcMissionNextCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const epicArcId = Number(key);
      for (const [missionKey, node] of Object.entries(
        (value as EpicArcRecord).missions ?? {},
      )) {
        const missionId = Number(missionKey);
        if (!missionIds.has(missionId)) continue;
        arcMissions.push({
          epicArcId,
          missionId,
          agentId: optionalNumber(node.agentID),
          failMissionId: optionalNumber(node.failMissionID),
          isDeleted: false,
        });
        for (const nextMissionId of node.nextMissions ?? []) {
          nextMissions.push({
            epicArcId,
            missionId,
            nextMissionId: Number(nextMissionId),
            isDeleted: false,
          });
        }
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const epicArcMissions = await ingestSdeCompositeTable({
      delegate: prisma.epicArcMission,
      rows: arcMissions,
      keyFields: ["epicArcId", "missionId"],
      scopeField: "epicArcId",
      scopeIds,
    });
    const epicArcMissionNext = await ingestSdeCompositeTable({
      delegate: prisma.epicArcMissionNext,
      rows: nextMissions,
      keyFields: ["epicArcId", "missionId", "nextMissionId"],
      scopeField: "epicArcId",
      scopeIds,
    });

    return {
      stats: { epicArcs, epicArcMissions, epicArcMissionNext },
      elapsed: performance.now() - start,
    };
  },
});
