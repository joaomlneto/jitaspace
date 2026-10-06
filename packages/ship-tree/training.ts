import type {
  EsiCharacterSkill,
  SkillTraining,
} from "@eve-online-tools/eve-ship-tree";

/** The fields of an ESI `/characters/{id}/skillqueue/` entry this reads. */
export interface EsiSkillQueueEntry {
  skill_id: number;
  finished_level: number;
  queue_position: number;
}

const isTrainableLevel = (level: number): level is SkillTraining["level"] =>
  Number.isInteger(level) && level >= 1 && level <= 5;

/**
 * The skill in training, for the library's group tooltips: the first entry of
 * the skill queue that the character has not finished yet.
 *
 * ESI keeps completed entries in the queue until the game client next syncs,
 * so the head of the queue can be a level that is already trained. Comparing
 * against the trained skills skips those without reading the clock, which a
 * prerendered page must not do. Returns `undefined` when nothing is training,
 * or while either list is still loading.
 */
export function getSkillInTraining(
  queue: readonly EsiSkillQueueEntry[] | undefined,
  skills: readonly EsiCharacterSkill[] | undefined,
): SkillTraining | undefined {
  if (!queue || !skills) return undefined;

  const trained = new Map(
    skills.map((skill) => [skill.skill_id, skill.trained_skill_level ?? 0]),
  );
  const next = queue
    .toSorted((a, b) => a.queue_position - b.queue_position)
    .find((entry) => entry.finished_level > (trained.get(entry.skill_id) ?? 0));

  if (!next || !isTrainableLevel(next.finished_level)) return undefined;
  return { skillId: next.skill_id, level: next.finished_level };
}
