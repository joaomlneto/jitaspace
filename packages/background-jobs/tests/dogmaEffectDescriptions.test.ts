import { describe, expect, it } from "@jest/globals";

import type {
  EffectInput,
  ModifierInput,
} from "../utils/dogmaEffectDescriptions";
import {
  checkDescription,
  directionOf,
  label,
  linkableIds,
  RESONANCE_UNIT_ID,
} from "../utils/dogmaEffectDescriptions";

const modifier = (overrides: Partial<ModifierInput> = {}): ModifierInput => ({
  func: "ItemModifier",
  domain: "shipID",
  operation: "PostPercent",
  modifiedAttribute: { id: 37, name: "Maximum Velocity" },
  modifyingAttribute: { id: 892, name: "freighterBonusM1" },
  direction: "increases",
  scalesWithSkills: [{ id: 20528, name: "Minmatar Freighter" }],
  group: null,
  skill: null,
  stoppedEffect: null,
  ...overrides,
});

const input = (modifiers: ModifierInput[] = [modifier()]): EffectInput => ({
  effectId: 1675,
  effect: {
    internalName: "freighterMaxVelocityBonusM1",
    displayName: null,
    category: "Passive",
    trueFlags: [],
    usesAttributes: { "cycle time": { id: 73, name: "Duration" } },
  },
  modifiers,
  itemsAreSkills: false,
});

describe("directionOf", () => {
  it("reads each operation from the items' values", () => {
    expect(directionOf(6, [5, 10], null)).toBe("increases");
    expect(directionOf(6, [-5], null)).toBe("decreases");
    expect(directionOf(4, [1.1], null)).toBe("increases");
    expect(directionOf(0, [0.9], null)).toBe("decreases");
    expect(directionOf(5, [2], null)).toBe("decreases");
    expect(directionOf(1, [0.5], null)).toBe("increases");
    expect(directionOf(2, [3], null)).toBe("increases");
    expect(directionOf(3, [3], null)).toBe("decreases");
  });

  it("says 'sets' for assignments, whatever the values", () => {
    expect(directionOf(-1, [], null)).toBe("sets");
    expect(directionOf(7, [0.25], null)).toBe("sets");
  });

  it("flips resistances, which are stored as resonances", () => {
    // A lower resonance is more resistance, as players see it.
    expect(directionOf(6, [-25], RESONANCE_UNIT_ID)).toBe("increases");
    expect(directionOf(4, [1.2], RESONANCE_UNIT_ID)).toBe("decreases");
  });

  it("reports mixed and unknown directions", () => {
    expect(directionOf(6, [-15, 75], null)).toBe("increases or decreases");
    expect(directionOf(6, [0], null)).toBeNull();
    expect(directionOf(4, [1], null)).toBeNull();
    expect(directionOf(6, [], null)).toBeNull();
    expect(directionOf(null, [5], null)).toBeNull();
    expect(directionOf(9, [5], null)).toBeNull();
  });
});

describe("label", () => {
  it("prefers the display name, ignoring blanks", () => {
    expect(label("Maximum Velocity", "maxVelocity", 37)).toBe(
      "Maximum Velocity",
    );
    expect(label("  ", "maxVelocity", 37)).toBe("maxVelocity");
    expect(label(null, null, 37)).toBe("#37");
  });
});

describe("linkableIds", () => {
  it("covers the effect, its attributes, groups, skills and stopped effects", () => {
    const ids = linkableIds(
      input([
        modifier({
          group: { id: 53, name: "Energy Weapon" },
          skill: { id: 3300, name: "Gunnery" },
          stoppedEffect: { id: 6441, name: "fighterAbilityMicroWarpDrive" },
        }),
      ]),
    );
    expect([...ids].sort()).toEqual(
      [
        "/dogma/attribute/37",
        "/dogma/attribute/73",
        "/dogma/attribute/892",
        "/dogma/effect/1675",
        "/dogma/effect/6441",
        "/group/53",
        "showinfo:20528",
        "showinfo:3300",
      ].sort(),
    );
  });
});

describe("checkDescription", () => {
  const ok =
    'Increases the ship\'s <a href="/dogma/attribute/37">Maximum Velocity</a> per <a href="showinfo:20528">Minmatar Freighter</a> level.';

  it("accepts text with links to ids from the input", () => {
    expect(checkDescription(ok, input())).toBeNull();
  });

  it("allows digits inside internal attribute names", () => {
    expect(
      checkDescription(
        "Multiplies the ship's shipBonusCarrierM1 through shipBonusCarrierM8 attributes per skill level.",
        input(),
      ),
    ).toBeNull();
  });

  it("rejects a link to an id the input does not have", () => {
    expect(
      checkDescription(
        'Increases <a href="showinfo:587">Rifter</a> speed.',
        input(),
      ),
    ).toBe("link to showinfo:587");
  });

  it("rejects other markup, entities and numbers", () => {
    expect(checkDescription("Increases <b>speed</b>.", input())).toBe(
      "markup other than links",
    );
    expect(checkDescription("Shield &amp; armor.", input())).toBe(
      "HTML entity",
    );
    expect(checkDescription("Increases Maximum Velocity by 5%.", input())).toBe(
      "a number",
    );
  });

  it("rejects empty and over-long descriptions", () => {
    expect(checkDescription("", input())).toBe("empty");
    expect(checkDescription("a".repeat(281), input())).toBe("too long");
    // Only visible text counts towards the length, not the link markup.
    const longLinks = `${'<a href="/dogma/attribute/37">Velocity</a> '.repeat(20)}`;
    expect(checkDescription(longLinks.trim(), input())).toBeNull();
  });
});
