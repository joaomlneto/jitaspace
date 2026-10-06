/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import { getSkillInTraining } from "../training";

const skill = (skill_id: number, trained_skill_level?: number) => ({
  skill_id,
  active_skill_level: trained_skill_level ?? 0,
  trained_skill_level,
});
const queued = (
  skill_id: number,
  finished_level: number,
  queue_position: number,
) => ({ skill_id, finished_level, queue_position });

describe("getSkillInTraining", () => {
  it("is the head of the queue when it is not trained yet", () => {
    expect(
      getSkillInTraining(
        [queued(3330, 4, 0), queued(3327, 5, 1)],
        [skill(3330, 3), skill(3327, 4)],
      ),
    ).toEqual({ skillId: 3330, level: 4 });
  });

  it("goes by queue position, not array order", () => {
    expect(
      getSkillInTraining(
        [queued(3327, 5, 1), queued(3330, 4, 0)],
        [skill(3330, 3), skill(3327, 4)],
      ),
    ).toEqual({ skillId: 3330, level: 4 });
  });

  // ESI keeps finished entries until the game client next syncs.
  it("skips levels the character has already trained", () => {
    expect(
      getSkillInTraining(
        [queued(3330, 3, 0), queued(3330, 4, 1)],
        [skill(3330, 3)],
      ),
    ).toEqual({ skillId: 3330, level: 4 });
  });

  it("counts a skill the character does not have as untrained", () => {
    expect(getSkillInTraining([queued(3333, 1, 0)], [])).toEqual({
      skillId: 3333,
      level: 1,
    });
    expect(
      getSkillInTraining([queued(3333, 1, 0)], [skill(3333, undefined)]),
    ).toEqual({ skillId: 3333, level: 1 });
  });

  it("is undefined when everything queued is trained, or the queue is empty", () => {
    expect(
      getSkillInTraining([queued(3330, 3, 0)], [skill(3330, 3)]),
    ).toBeUndefined();
    expect(getSkillInTraining([], [skill(3330, 3)])).toBeUndefined();
  });

  it("is undefined while either list is loading", () => {
    expect(getSkillInTraining(undefined, [skill(3330, 3)])).toBeUndefined();
    expect(getSkillInTraining([queued(3330, 4, 0)], undefined)).toBeUndefined();
  });

  it("ignores a level the library cannot draw", () => {
    expect(getSkillInTraining([queued(3330, 6, 0)], [])).toBeUndefined();
  });

  it("does not reorder the queue it is given", () => {
    const queue = [queued(3327, 5, 1), queued(3330, 4, 0)];
    getSkillInTraining(queue, []);
    expect(queue.map((entry) => entry.queue_position)).toEqual([1, 0]);
  });
});
