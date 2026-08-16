import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// The history breadcrumb labels resolve names through these server actions,
// which read our own database. Stub Prisma so the tests drive the row shapes
// (found / missing / blank name / query failure) rather than a live client.

type Row = Record<string, unknown> | null;

const findUnique = jest.fn<(args?: unknown) => Promise<Row>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    category: { findUnique: (a?: unknown) => findUnique(a) },
    group: { findUnique: (a?: unknown) => findUnique(a) },
    type: { findUnique: (a?: unknown) => findUnique(a) },
    marketGroup: { findUnique: (a?: unknown) => findUnique(a) },
    race: { findUnique: (a?: unknown) => findUnique(a) },
    dogmaAttribute: { findUnique: (a?: unknown) => findUnique(a) },
    dogmaEffect: { findUnique: (a?: unknown) => findUnique(a) },
    dogmaUnit: { findUnique: (a?: unknown) => findUnique(a) },
  },
}));

const actions =
  require("~/app/history/actions") as typeof import("~/app/history/actions");

beforeEach(() => {
  findUnique.mockReset();
});

/** The five plain name lookups, with the parent each contributes (if any). */
const simpleCases = [
  {
    name: "category",
    fn: () => actions.resolveCategoryLabel(1),
    row: { name: "Ship" },
    expected: { name: "Ship", parentId: null },
  },
  {
    name: "group",
    fn: () => actions.resolveGroupLabel(25),
    row: { name: "Frigate", categoryId: 6 },
    expected: { name: "Frigate", parentId: 6 },
  },
  {
    name: "type",
    fn: () => actions.resolveTypeLabel(587),
    row: { name: "Rifter", groupId: 25 },
    expected: { name: "Rifter", parentId: 25 },
  },
  {
    name: "marketGroup",
    fn: () => actions.resolveMarketGroupLabel(4),
    row: { name: "Ships", parentMarketGroupId: 2 },
    expected: { name: "Ships", parentId: 2 },
  },
  {
    name: "race",
    fn: () => actions.resolveRaceLabel(1),
    row: { name: "Caldari" },
    expected: { name: "Caldari", parentId: null },
  },
];

describe("history SDE label actions", () => {
  it.each(simpleCases)("$name resolves its name and parent", async (c) => {
    findUnique.mockResolvedValue(c.row);
    await expect(c.fn()).resolves.toEqual(c.expected);
  });

  it.each(simpleCases)(
    "$name returns a null label for an unknown id",
    async (c) => {
      findUnique.mockResolvedValue(null);
      await expect(c.fn()).resolves.toEqual({ name: null, parentId: null });
    },
  );

  it.each(simpleCases)("$name swallows a query failure", async (c) => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(c.fn()).resolves.toEqual({ name: null, parentId: null });
  });

  it("market group reports a null parent for a root group", async () => {
    findUnique.mockResolvedValue({ name: "Ships", parentMarketGroupId: null });
    await expect(actions.resolveMarketGroupLabel(4)).resolves.toEqual({
      name: "Ships",
      parentId: null,
    });
  });
});

describe("resolveDogmaAttributeLabel", () => {
  it("prefers displayName and carries the unit and highIsGood", async () => {
    findUnique.mockResolvedValue({
      displayName: "Structure Hitpoints",
      name: "hp",
      unitId: 9,
      highIsGood: true,
    });
    await expect(actions.resolveDogmaAttributeLabel(9)).resolves.toEqual({
      name: "Structure Hitpoints",
      unitId: 9,
      highIsGood: true,
    });
  });

  it("falls back to the internal name when displayName is blank", async () => {
    // A present-but-empty displayName must not win — `??` would have kept "".
    findUnique.mockResolvedValue({
      displayName: "   ",
      name: "hp",
      unitId: null,
      highIsGood: null,
    });
    await expect(actions.resolveDogmaAttributeLabel(9)).resolves.toMatchObject({
      name: "hp",
    });
  });

  it("reports a null name when neither field has text", async () => {
    findUnique.mockResolvedValue({
      displayName: null,
      name: null,
      unitId: null,
      highIsGood: null,
    });
    await expect(actions.resolveDogmaAttributeLabel(9)).resolves.toEqual({
      name: null,
      unitId: null,
      highIsGood: null,
    });
  });

  it("returns a null attribute for an unknown id", async () => {
    findUnique.mockResolvedValue(null);
    await expect(actions.resolveDogmaAttributeLabel(9)).resolves.toEqual({
      name: null,
      unitId: null,
      highIsGood: null,
    });
  });

  it("swallows a query failure", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(actions.resolveDogmaAttributeLabel(9)).resolves.toEqual({
      name: null,
      unitId: null,
      highIsGood: null,
    });
  });
});

describe("resolveDogmaEffectLabel", () => {
  it("prefers displayName over the internal name", async () => {
    findUnique.mockResolvedValue({ displayName: "Shield Boost", name: "sb" });
    await expect(actions.resolveDogmaEffectLabel(11)).resolves.toEqual({
      name: "Shield Boost",
      parentId: null,
    });
  });

  it("returns a null label for an unknown id", async () => {
    findUnique.mockResolvedValue(null);
    await expect(actions.resolveDogmaEffectLabel(11)).resolves.toEqual({
      name: null,
      parentId: null,
    });
  });

  it("swallows a query failure", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(actions.resolveDogmaEffectLabel(11)).resolves.toEqual({
      name: null,
      parentId: null,
    });
  });
});

describe("resolveDogmaUnitLabel", () => {
  it("returns the unit symbol", async () => {
    findUnique.mockResolvedValue({ displayName: "m/s", name: "meters" });
    await expect(actions.resolveDogmaUnitLabel(1)).resolves.toEqual({
      name: "m/s",
      parentId: null,
    });
  });

  it("falls back to the plain name when the symbol is blank", async () => {
    findUnique.mockResolvedValue({ displayName: "", name: "meters" });
    await expect(actions.resolveDogmaUnitLabel(1)).resolves.toMatchObject({
      name: "meters",
    });
  });

  it("returns a null label for an unknown id", async () => {
    findUnique.mockResolvedValue(null);
    await expect(actions.resolveDogmaUnitLabel(1)).resolves.toEqual({
      name: null,
      parentId: null,
    });
  });

  it("swallows a query failure", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(actions.resolveDogmaUnitLabel(1)).resolves.toEqual({
      name: null,
      parentId: null,
    });
  });
});
