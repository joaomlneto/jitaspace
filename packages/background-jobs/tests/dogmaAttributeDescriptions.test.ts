import { describe, expect, it } from "@jest/globals";

import type { AttributeInput } from "../utils/dogmaAttributeDescriptions";
import {
  attributeLinkableIds,
  checkAttributeDescription,
} from "../utils/dogmaAttributeDescriptions";

const input: AttributeInput = {
  attributeId: 892,
  attribute: {
    internalName: "freighterBonusM1",
    displayName: null,
    unit: null,
    category: null,
    ccpTooltip: null,
    ccpNote: null,
    minimumFrom: null,
    maximumFrom: { id: 2033, name: "Maximum Tracking" },
    rechargeTimeFrom: null,
  },
  itemKinds: [{ kind: "Ship", items: 2 }],
  scaledBySkills: [{ id: 20528, name: "Minmatar Freighter" }],
  changedBy: [
    {
      effect: { id: 1666, name: "freighterM1SkillLevel" },
      func: "ItemModifier",
      domain: "shipID",
      operation: "PreMul",
      group: null,
      skill: null,
      // Changing itself through the skill's level: never linkable.
      modifyingAttribute: { id: 280, name: "Level" },
    },
  ],
  changedByTotal: 1,
  changes: [
    {
      effect: { id: 1675, name: "freighterMaxVelocityBonusM1" },
      func: "LocationGroupModifier",
      domain: "shipID",
      operation: "PostPercent",
      group: { id: 53, name: "Energy Weapon" },
      skill: { id: 3300, name: "Gunnery" },
      modifiedAttribute: { id: 37, name: "Maximum Velocity" },
    },
    {
      effect: { id: 9999, name: "selfReference" },
      func: "ItemModifier",
      domain: "itemID",
      operation: "ModAdd",
      group: null,
      skill: null,
      modifiedAttribute: { id: 892, name: "freighterBonusM1" },
    },
  ],
  changesTotal: 2,
  usedAsStatBy: [
    { effect: { id: 10, name: "targetAttack" }, role: "tracking" },
  ],
};

describe("attributeLinkableIds", () => {
  it("covers every effect, attribute, group and skill in the input", () => {
    expect([...attributeLinkableIds(input)].sort()).toEqual(
      [
        "/dogma/attribute/2033",
        "/dogma/attribute/280",
        "/dogma/attribute/37",
        "/dogma/effect/10",
        "/dogma/effect/1666",
        "/dogma/effect/1675",
        "/dogma/effect/9999",
        "/group/53",
        "showinfo:20528",
        "showinfo:3300",
      ].sort(),
    );
  });

  it("never lets a description link the attribute it describes", () => {
    expect(attributeLinkableIds(input).has("/dogma/attribute/892")).toBe(false);
  });
});

describe("checkAttributeDescription", () => {
  it("accepts linked text built from the input", () => {
    expect(
      checkAttributeDescription(
        'A freighter hull bonus to its <a href="/dogma/attribute/37">Maximum Velocity</a>, applied per <a href="showinfo:20528">Minmatar Freighter</a> level.',
        input,
      ),
    ).toBeNull();
  });

  it("rejects a link to the attribute itself or to unknown ids", () => {
    expect(
      checkAttributeDescription(
        'The <a href="/dogma/attribute/892">bonus</a> itself.',
        input,
      ),
    ).toBe("link to /dogma/attribute/892");
    expect(
      checkAttributeDescription(
        'Found on the <a href="showinfo:20185">Fenrir</a>.',
        input,
      ),
    ).toBe("link to showinfo:20185");
  });

  it("rejects numbers like any other description", () => {
    expect(
      checkAttributeDescription(
        "Raises velocity by five percent, or 5%.",
        input,
      ),
    ).toBe("a number");
  });
});
