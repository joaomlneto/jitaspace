import { describe, expect, it } from "@jest/globals";

import type { DogmaModifier } from "~/lib/dogmaModifiers";
import {
  dogmaDomainNoun,
  dogmaOperatorInfo,
  groupDogmaModifiers,
} from "~/lib/dogmaModifiers";

const modifier = (
  overrides: Partial<DogmaModifier> & { modifierIndex: number },
): DogmaModifier => ({
  func: "ItemModifier",
  domain: "shipID",
  operator: 6,
  modifiedAttributeId: null,
  modifyingAttributeId: null,
  groupId: null,
  skillTypeId: null,
  targetEffectId: null,
  ...overrides,
});

describe("dogmaOperatorInfo", () => {
  it("names every operation the SDE uses except the undocumented 9", () => {
    expect(dogmaOperatorInfo(-1)?.name).toBe("PreAssign");
    expect(dogmaOperatorInfo(0)?.name).toBe("PreMul");
    expect(dogmaOperatorInfo(2)?.symbol).toBe("+");
    expect(dogmaOperatorInfo(3)?.symbol).toBe("−");
    expect(dogmaOperatorInfo(4)?.name).toBe("PostMul");
    expect(dogmaOperatorInfo(5)?.symbol).toBe("÷");
    expect(dogmaOperatorInfo(6)).toMatchObject({
      name: "PostPercent",
      suffix: "%",
    });
    expect(dogmaOperatorInfo(7)?.symbol).toBe("=");
    expect(dogmaOperatorInfo(9)).toBeNull();
    expect(dogmaOperatorInfo(null)).toBeNull();
  });
});

describe("dogmaDomainNoun", () => {
  it("reads known domains and passes unknown ones through", () => {
    expect(dogmaDomainNoun("shipID")).toBe("ship");
    expect(dogmaDomainNoun("charID")).toBe("character");
    expect(dogmaDomainNoun("target")).toBe("target");
    expect(dogmaDomainNoun("somethingNew")).toBe("somethingNew");
    expect(dogmaDomainNoun(null)).toBe("unknown domain");
  });
});

describe("groupDogmaModifiers", () => {
  it("keeps a lone modifier as its own line", () => {
    const lines = groupDogmaModifiers([
      modifier({
        modifierIndex: 0,
        func: "LocationGroupModifier",
        groupId: 53,
        modifiedAttributeId: 160,
        modifyingAttributeId: 767,
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      key: "0",
      groupIds: [53],
      modifiedAttributeIds: [160],
      modifyingAttributeId: 767,
    });
  });

  it("merges attributes changed the same way (Assault Damage Control)", () => {
    const lines = groupDogmaModifiers(
      [271, 272, 273, 274].map((modifiedAttributeId, index) =>
        modifier({
          modifierIndex: index,
          domain: "itemID",
          operator: 7,
          modifiedAttributeId,
          modifyingAttributeId: 2746,
        }),
      ),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.modifiedAttributeIds).toEqual([271, 272, 273, 274]);
    expect(lines[0]?.modifiers).toHaveLength(4);
  });

  it("merges groups first, then attributes (structure missile damage)", () => {
    const damageTypes = [114, 116, 117, 118];
    const lines = groupDogmaModifiers(
      [1548, 4186].flatMap((groupId, groupIndex) =>
        damageTypes.map((modifiedAttributeId, index) =>
          modifier({
            modifierIndex: groupIndex * 4 + index,
            func: "LocationGroupModifier",
            domain: "structureID",
            groupId,
            modifiedAttributeId,
            modifyingAttributeId: 292,
          }),
        ),
      ),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.groupIds).toEqual([1548, 4186]);
    expect(lines[0]?.modifiedAttributeIds).toEqual(damageTypes);
    expect(lines[0]?.modifiers.map((m) => m.modifierIndex)).toEqual([
      0, 4, 1, 5, 2, 6, 3, 7,
    ]);
  });

  it("keeps different modifying attributes apart (control tower resists)", () => {
    const lines = groupDogmaModifiers(
      [838, 839].flatMap((groupId, groupIndex) => [
        modifier({
          modifierIndex: groupIndex * 2,
          func: "LocationGroupModifier",
          operator: 0,
          groupId,
          modifiedAttributeId: 113,
          modifyingAttributeId: 974,
        }),
        modifier({
          modifierIndex: groupIndex * 2 + 1,
          func: "LocationGroupModifier",
          operator: 0,
          groupId,
          modifiedAttributeId: 111,
          modifyingAttributeId: 975,
        }),
      ]),
    );
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.groupIds)).toEqual([
      [838, 839],
      [838, 839],
    ]);
    expect(lines.map((line) => line.modifyingAttributeId)).toEqual([974, 975]);
  });

  it("merges effect stoppers on the same domain, apart from other lines", () => {
    const lines = groupDogmaModifiers([
      modifier({
        modifierIndex: 0,
        domain: "targetID",
        operator: 2,
        modifiedAttributeId: 104,
        modifyingAttributeId: 105,
      }),
      modifier({
        modifierIndex: 1,
        func: "EffectStopper",
        domain: "target",
        operator: null,
        targetEffectId: 6441,
      }),
      modifier({
        modifierIndex: 2,
        func: "EffectStopper",
        domain: "target",
        operator: null,
        targetEffectId: 6442,
      }),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({
      key: "1-2",
      func: "EffectStopper",
      targetEffectIds: [6441, 6442],
    });
  });

  it("never merges across skills or operators", () => {
    const lines = groupDogmaModifiers([
      modifier({
        modifierIndex: 0,
        func: "LocationRequiredSkillModifier",
        skillTypeId: 3454,
        modifiedAttributeId: 1,
        modifyingAttributeId: 2,
      }),
      modifier({
        modifierIndex: 1,
        func: "LocationRequiredSkillModifier",
        skillTypeId: 4385,
        modifiedAttributeId: 1,
        modifyingAttributeId: 2,
      }),
      modifier({
        modifierIndex: 2,
        func: "LocationRequiredSkillModifier",
        skillTypeId: 3454,
        operator: 4,
        modifiedAttributeId: 3,
        modifyingAttributeId: 2,
      }),
    ]);
    expect(lines).toHaveLength(3);
  });

  it("orders lines by their first modifier, not by input order", () => {
    const lines = groupDogmaModifiers([
      modifier({ modifierIndex: 1, modifiedAttributeId: 9, operator: 2 }),
      modifier({ modifierIndex: 0, modifiedAttributeId: 8, operator: 4 }),
    ]);
    expect(lines.map((line) => line.key)).toEqual(["0", "1"]);
  });
});
