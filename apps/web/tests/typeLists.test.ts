import { describe, expect, it } from "@jest/globals";

import type { TypeListRule } from "~/lib/typeLists";
import {
  buildTypeListRuleIndex,
  countTypeListMembers,
  isTypeListMember,
  matchTypeLists,
} from "~/lib/typeLists";

// Shapes taken from typeLists.yaml (build 3569502).
const rules: TypeListRule[] = [
  // 41 "Ships only - NOT Capsules": category 6 minus group 29.
  { typeListId: 41, included: true, refType: "category", refId: 6 },
  { typeListId: 41, included: false, refType: "group", refId: 29 },
  // 20 "FleetEvaluationIsFleetShip": category 6 minus some groups and types.
  { typeListId: 20, included: true, refType: "category", refId: 6 },
  { typeListId: 20, included: false, refType: "group", refId: 31 },
  { typeListId: 20, included: false, refType: "type", refId: 587 },
  // 10 "KillreportEligable": category 6 and an extra type, named twice.
  { typeListId: 10, included: true, refType: "category", refId: 6 },
  { typeListId: 10, included: true, refType: "type", refId: 587 },
  // 34 "Asteroids": category 25 only.
  { typeListId: 34, included: true, refType: "category", refId: 25 },
];

const rifter = { typeId: 587, groupId: 25, categoryId: 6 };
const capsule = { typeId: 670, groupId: 29, categoryId: 6 };
const shuttle = { typeId: 672, groupId: 31, categoryId: 6 };
const veldspar = { typeId: 1230, groupId: 462, categoryId: 25 };

describe("matchTypeLists", () => {
  const index = buildTypeListRuleIndex(rules);

  it("reports every matching list by id, with each kind of rule that matched", () => {
    expect(matchTypeLists(index, rifter)).toEqual([
      { typeListId: 10, includedBy: ["category", "type"], excludedBy: [] },
      { typeListId: 20, includedBy: ["category"], excludedBy: ["type"] },
      { typeListId: 41, includedBy: ["category"], excludedBy: [] },
    ]);
  });

  it("lets an exclude rule override a broader include", () => {
    const [list41] = matchTypeLists(index, capsule).filter(
      (match) => match.typeListId === 41,
    );
    expect(list41).toEqual({
      typeListId: 41,
      includedBy: ["category"],
      excludedBy: ["group"],
    });
    expect(list41 && isTypeListMember(list41)).toBe(false);
  });

  it("is a member only when included and not excluded", () => {
    expect(
      matchTypeLists(index, rifter)
        .filter(isTypeListMember)
        .map((match) => match.typeListId),
    ).toEqual([10, 41]);
    expect(
      isTypeListMember({ typeListId: 1, includedBy: [], excludedBy: [] }),
    ).toBe(false);
  });

  it("returns nothing for a type no rule names", () => {
    expect(
      matchTypeLists(index, { typeId: 34, groupId: 18, categoryId: 4 }),
    ).toEqual([]);
  });
});

describe("countTypeListMembers", () => {
  it("counts each list's members, omitting empty lists", () => {
    const counts = countTypeListMembers(rules, [
      rifter,
      capsule,
      shuttle,
      veldspar,
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      10: 3, // rifter, capsule, shuttle
      20: 1, // capsule; rifter by type, shuttle by group are excluded
      34: 1, // veldspar
      41: 2, // rifter, shuttle; capsule's group is excluded
    });
  });

  it("weights a classification standing for several types", () => {
    // 10 more frigates no type rule names, counted as one group-level entry.
    const counts = countTypeListMembers(rules, [
      rifter,
      { typeId: -1, groupId: 25, categoryId: 6, count: 10 },
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      10: 11,
      20: 10, // rifter is excluded by type; the other 10 are not
      41: 11,
    });
  });
});
