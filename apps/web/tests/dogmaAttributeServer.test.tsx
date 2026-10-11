import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// The attribute route's server half: what it reads from the database and how
// it shapes the client page's props. Prisma is stubbed per model.

type Rows = Record<string, unknown>[];

const attributeFindUnique =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown> | null>>();
const attributeFindMany = jest.fn<(args?: unknown) => Promise<Rows>>();
const modifierFindMany =
  jest.fn<(args?: { where?: object }) => Promise<Rows>>();
const effectFindMany = jest.fn<(args?: unknown) => Promise<Rows>>();
const typeFindMany = jest.fn<(args?: unknown) => Promise<Rows>>();
const typeAttributeAggregate =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    dogmaAttribute: {
      findUnique: (a?: unknown) => attributeFindUnique(a),
      findMany: (a?: unknown) => attributeFindMany(a),
    },
    dogmaEffectModifier: {
      findMany: (a?: { where?: object }) => modifierFindMany(a),
    },
    dogmaEffect: { findMany: (a?: unknown) => effectFindMany(a) },
    type: { findMany: (a?: unknown) => typeFindMany(a) },
    typeAttribute: { aggregate: (a?: unknown) => typeAttributeAggregate(a) },
  },
}));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));
jest.mock("~/app/dogma/attribute/[attributeId]/page.client", () => ({
  __esModule: true,
  default: () => null,
}));

async function runRoute(attributeId: string): Promise<Record<string, unknown>> {
  const Page = (
    require("~/app/dogma/attribute/[attributeId]/page") as {
      default: (p: {
        params: Promise<{ attributeId: string }>;
      }) => ReactElement<{ children: ReactElement }>;
    }
  ).default;
  const child = Page({ params: Promise.resolve({ attributeId }) }).props
    .children;
  const resolved = await (child.type as (p: unknown) => Promise<ReactElement>)(
    child.props,
  );
  return resolved.props as Record<string, unknown>;
}

const modifierRow = (overrides: Record<string, unknown>) => ({
  effectId: 5189,
  modifierIndex: 0,
  func: "LocationGroupModifier",
  domain: "shipID",
  operator: 6,
  modifiedAttributeId: 160,
  modifyingAttributeId: 767,
  groupId: 53,
  group: { name: "Energy Weapon" },
  skillTypeId: null,
  targetEffectId: null,
  targetEffect: null,
  effect: {
    name: "trackingSpeedBonusEffectLasers",
    displayName: null,
    _count: { TypeEffect: 58 },
  },
  ...overrides,
});

beforeEach(() => {
  attributeFindUnique.mockReset().mockResolvedValue({
    attributeId: 160,
    name: "trackingSpeed",
    displayName: "Turret Tracking",
    description: "Weapon accuracy",
    customDescription: "  How fast a turret follows its target.  ",
    tooltipTitle: "Turret Tracking",
    tooltipDescription: "  ",
    defaultValue: 0,
    highIsGood: true,
    published: true,
    stackable: false,
    displayWhenZero: false,
    dataType: 5,
    iconId: 1398,
    minAttributeId: null,
    maxAttributeId: 2033,
    chargeRechargeTimeId: null,
    DogmaUnit: {
      unitId: 117,
      name: "radians/second",
      displayName: "",
      description: null,
    },
    attributeCategory: {
      attributeCategoryId: 7,
      name: "Turrets",
      description: null,
    },
  });
  modifierFindMany.mockReset().mockImplementation((args) => {
    const where = (args?.where ?? {}) as { modifiedAttributeId?: number };
    // Changed by: the tracking bonus; changes: a skill-required modifier.
    return Promise.resolve(
      where.modifiedAttributeId === 160
        ? [modifierRow({})]
        : [
            modifierRow({
              effectId: 600,
              modifiedAttributeId: 54,
              modifyingAttributeId: 160,
              func: "LocationRequiredSkillModifier",
              groupId: null,
              group: null,
              skillTypeId: 3300,
              effect: {
                name: "x",
                displayName: "Readable",
                _count: { TypeEffect: 2 },
              },
            }),
          ],
    );
  });
  effectFindMany.mockReset().mockResolvedValue([
    {
      effectId: 10,
      name: "targetAttack",
      displayName: null,
      dischargeAttributeId: null,
      durationAttributeId: null,
      rangeAttributeId: null,
      falloffAttributeId: null,
      trackingSpeedAttributeId: 160,
      resistanceAttributeId: null,
      npcUsageChanceAttributeId: null,
      npcActivationChanceAttributeId: null,
      fittingUsageChanceAttributeId: null,
    },
  ]);
  attributeFindMany.mockReset().mockResolvedValue([
    {
      attributeId: 160,
      name: "trackingSpeed",
      displayName: "Turret Tracking",
      unitId: 117,
      DogmaUnit: { displayName: null },
    },
    {
      attributeId: 767,
      name: "trackingSpeedBonus",
      displayName: "Tracking Speed Bonus",
      unitId: 105,
      DogmaUnit: { displayName: "%" },
    },
    {
      attributeId: 2033,
      name: "maxTrackingSpeed",
      displayName: "  ",
      unitId: null,
      DogmaUnit: null,
    },
  ]);
  typeFindMany
    .mockReset()
    .mockResolvedValue([{ typeId: 3300, name: "Gunnery" }]);
  typeAttributeAggregate.mockReset().mockResolvedValue({
    _count: 6822,
    _min: { value: 0.01 },
    _max: { value: 0.5 },
  });
});

describe("dogma attribute route (server)", () => {
  it("shapes the attribute, trimming blanks to null", async () => {
    const props = await runRoute("160");
    expect(props).toMatchObject({
      attributeId: 160,
      displayName: "Turret Tracking",
      customDescription: "How fast a turret follows its target.",
      description: "Weapon accuracy",
      tooltipDescription: null,
      unit: { unitId: 117, name: "radians/second", displayName: null },
      category: { categoryId: 7, name: "Turrets" },
      minAttribute: null,
      maxAttribute: {
        attributeId: 2033,
        name: "maxTrackingSpeed",
        displayName: null,
      },
      itemCount: 6822,
      valueRange: { min: 0.01, max: 0.5 },
    });
  });

  it("names both sides of every modifier, and the effects using it as a stat", async () => {
    const props = await runRoute("160");
    expect(props.modifiedBy).toEqual([
      expect.objectContaining({
        effectId: 5189,
        effectName: "trackingSpeedBonusEffectLasers",
        carrierCount: 58,
        groupName: "Energy Weapon",
        skillName: null,
      }),
    ]);
    expect(props.modifies).toEqual([
      expect.objectContaining({
        effectId: 600,
        effectName: "Readable",
        skillTypeId: 3300,
        skillName: "Gunnery",
      }),
    ]);
    expect(props.statOf).toEqual([
      { effectId: 10, effectName: "targetAttack", role: "Tracking" },
    ]);
    expect(props.attributes).toContainEqual({
      attributeId: 767,
      name: "trackingSpeedBonus",
      displayName: "Tracking Speed Bonus",
      unitId: 105,
      unitSymbol: "%",
    });
  });

  it("counts only live items of live types", async () => {
    await runRoute("160");
    expect(typeAttributeAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          attributeId: 160,
          isDeleted: false,
          type: { isDeleted: false },
        },
      }),
    );
  });

  it("has no value range when no item has the attribute", async () => {
    typeAttributeAggregate.mockResolvedValue({
      _count: 0,
      _min: { value: null },
      _max: { value: null },
    });
    const props = await runRoute("160");
    expect(props.itemCount).toBe(0);
    expect(props.valueRange).toBeNull();
  });

  it("404s for an attribute that does not exist", async () => {
    attributeFindUnique.mockResolvedValue(null);
    await expect(runRoute("999999")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
