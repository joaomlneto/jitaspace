import type { Prisma } from "../../../db";

/**
 * Pure transforms for missions.yaml. Type-only `Prisma` import, so this module
 * pulls in no runtime dependencies and is unit-testable without mocking p-limit
 * or the zod-checked env (see ./militaryCampaignTransforms for the same pattern).
 */

function enString(value: unknown): string | null {
  if (typeof value === "object" && value !== null) {
    const en = (value as { en?: unknown }).en;
    if (typeof en === "string") return en;
  }
  return null;
}

const optionalNumber = (value: unknown): number | null =>
  value == null ? null : Number(value);

const optionalBoolean = (value: unknown): boolean | null =>
  value == null ? null : Boolean(value);

/** `record.<key>` as a nested object, or `{}`. */
const obj = (value: unknown): Record<string, unknown> =>
  (value ?? {}) as Record<string, unknown>;

/**
 * Build the flat Mission row for one SDE record.
 *
 * `killMission`, `courierMission` and `missionRewards` are single sub-objects
 * flattened into prefixed columns, as MetaGroup does for `color`.
 *
 * `killMission.dropItemInMissionContainer` is a types.yaml id despite its name —
 * it is a number in every occurrence, never a boolean. Coercing it with
 * Boolean() turned each id into `true` and lost the item.
 */
export function toMissionRow(
  missionId: number,
  record: Record<string, unknown>,
): Prisma.MissionCreateManyInput {
  const kill = obj(record.killMission);
  const courier = obj(record.courierMission);
  const rewards = obj(record.missionRewards);
  const reward = obj(rewards.reward);
  const bonus = obj(rewards.bonusReward);

  return {
    missionId,
    name: enString(record.name) ?? "",
    factionId: optionalNumber(record.factionID),
    corporationId: optionalNumber(record.corporationID),
    agentTypeId: optionalNumber(record.agentTypeID),
    expirationTime: optionalNumber(record.expirationTime),
    hasStandingRewards: optionalBoolean(record.hasStandingRewards),
    initialAgentGiftTypeId: optionalNumber(record.initialAgentGiftTypeID),
    initialAgentGiftQuantity: optionalNumber(record.initialAgentGiftQuantity),
    killDungeonId: optionalNumber(kill.dungeonID),
    killObjectiveTypeId: optionalNumber(kill.objectiveTypeID),
    killObjectiveQuantity: optionalNumber(kill.objectiveQuantity),
    killDropItemInMissionContainerTypeId: optionalNumber(
      kill.dropItemInMissionContainer,
    ),
    courierObjectiveTypeId: optionalNumber(courier.objectiveTypeID),
    courierObjectiveQuantity: optionalNumber(courier.objectiveQuantity),
    courierObjectiveSingleton: optionalBoolean(courier.objectiveSingleton),
    rewardTypeId: optionalNumber(reward.rewardTypeID),
    rewardQuantity: optionalNumber(reward.rewardQuantity),
    bonusRewardTypeId: optionalNumber(bonus.rewardTypeID),
    bonusRewardQuantity: optionalNumber(bonus.rewardQuantity),
    bonusTimeInterval: optionalNumber(rewards.bonusTimeInterval),
    isDeleted: false,
  };
}

/**
 * Flatten a mission's `messages` map (dotted message id → localized text) into
 * MissionMessage rows. Slots with no English text are dropped, since `text` is
 * non-null.
 */
export function toMissionMessageRows(
  missionId: number,
  messages: Record<string, unknown> | undefined,
): Prisma.MissionMessageCreateManyInput[] {
  const rows: Prisma.MissionMessageCreateManyInput[] = [];
  for (const [key, text] of Object.entries(messages ?? {})) {
    const en = enString(text);
    if (en === null) continue;
    rows.push({ missionId, key, text: en, isDeleted: false });
  }
  return rows;
}

/** Flatten `extraStandings` (factionID → standing) into rows. */
export function toMissionExtraStandingRows(
  missionId: number,
  extraStandings: Record<string, number> | undefined,
): Prisma.MissionExtraStandingCreateManyInput[] {
  return Object.entries(extraStandings ?? {}).map(([factionKey, standing]) => ({
    missionId,
    factionId: Number(factionKey),
    value: Number(standing),
    isDeleted: false,
  }));
}
