import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
} from "../../../helpers";

export interface IngestSdeMissionsEventPayload {
  data: Record<string, never>;
}

interface MissionRecord {
  messages?: Record<string, unknown>;
  extraStandings?: Record<string, number>;
}

/** `record.<obj>.<key>` as a number, for the flattened sub-objects. */
const sub = (record: Record<string, unknown>, obj: string) =>
  (record[obj] ?? {}) as Record<string, unknown>;

/**
 * missions.yaml — agent missions. `killMission`, `courierMission` and
 * `missionRewards` are single sub-objects flattened into prefixed columns; the
 * `messages` map (dotted message id → localized text) and the `extraStandings`
 * map (factionID → standing) become child tables.
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
      toRow: (record, id): Prisma.MissionCreateManyInput => {
        const kill = sub(record, "killMission");
        const courier = sub(record, "courierMission");
        const rewards = sub(record, "missionRewards");
        const reward = (rewards.reward ?? {}) as Record<string, unknown>;
        const bonus = (rewards.bonusReward ?? {}) as Record<string, unknown>;
        return {
          missionId: id,
          name: enString(record.name) ?? "",
          factionId: optionalNumber(record.factionID),
          corporationId: optionalNumber(record.corporationID),
          agentTypeId: optionalNumber(record.agentTypeID),
          expirationTime: optionalNumber(record.expirationTime),
          hasStandingRewards: optionalBoolean(record.hasStandingRewards),
          initialAgentGiftTypeId: optionalNumber(record.initialAgentGiftTypeID),
          initialAgentGiftQuantity: optionalNumber(
            record.initialAgentGiftQuantity,
          ),
          killDungeonId: optionalNumber(kill.dungeonID),
          killObjectiveTypeId: optionalNumber(kill.objectiveTypeID),
          killObjectiveQuantity: optionalNumber(kill.objectiveQuantity),
          killDropItemInMissionContainer: optionalBoolean(
            kill.dropItemInMissionContainer,
          ),
          courierObjectiveTypeId: optionalNumber(courier.objectiveTypeID),
          courierObjectiveQuantity: optionalNumber(courier.objectiveQuantity),
          courierObjectiveSingleton: optionalBoolean(
            courier.objectiveSingleton,
          ),
          rewardTypeId: optionalNumber(reward.rewardTypeID),
          rewardQuantity: optionalNumber(reward.rewardQuantity),
          bonusRewardTypeId: optionalNumber(bonus.rewardTypeID),
          bonusRewardQuantity: optionalNumber(bonus.rewardQuantity),
          bonusTimeInterval: optionalNumber(rewards.bonusTimeInterval),
          isDeleted: false,
        };
      },
    });

    const messages: Prisma.MissionMessageCreateManyInput[] = [];
    const extraStandings: Prisma.MissionExtraStandingCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const missionId = Number(key);
      const record = value as MissionRecord;
      for (const [messageKey, text] of Object.entries(record.messages ?? {})) {
        const en = enString(text);
        // Skip slots that carry no English text — the column is non-null.
        if (en === null) continue;
        messages.push({
          missionId,
          key: messageKey,
          text: en,
          isDeleted: false,
        });
      }
      for (const [factionKey, standing] of Object.entries(
        record.extraStandings ?? {},
      )) {
        extraStandings.push({
          missionId,
          factionId: Number(factionKey),
          value: Number(standing),
          isDeleted: false,
        });
      }
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
