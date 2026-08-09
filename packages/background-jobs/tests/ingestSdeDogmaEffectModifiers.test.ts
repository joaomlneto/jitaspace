import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { ingestSdeDogmaEffectModifiers as IngestSdeDogmaEffectModifiers } from "../jobs/scrape/sde/ingestSdeDogmaEffectModifiers";

// The job pulls in p-limit (ESM) and a real Prisma client (via ../db, which
// builds one from the zod-checked env). Stub both so the test exercises only the
// row-building and FK guarding, feeding a fake SDE into the loader.
// (@swc/jest doesn't hoist jest.mock, and the real modules crash if loaded, so
// the job is imported lazily in beforeAll — after these mocks are registered.)
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const dogmaEffectModifier = {
  findMany: jest.fn((_args?: unknown) => Promise.resolve<unknown[]>([])),
  createMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
  update: jest.fn((_args?: unknown) => Promise.resolve({})),
  updateMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
};

jest.mock("../db", () => ({ prisma: { dogmaEffectModifier } }));

const loadSdeFiles = jest.fn();

jest.mock("../helpers/loadSdeFile", () => ({
  loadSdeFile: jest.fn(),
  loadSdeFiles: (...args: unknown[]) => loadSdeFiles(...args),
}));

let ingestSdeDogmaEffectModifiers: typeof IngestSdeDogmaEffectModifiers;

beforeAll(async () => {
  ({ ingestSdeDogmaEffectModifiers } =
    await import("../jobs/scrape/sde/ingestSdeDogmaEffectModifiers"));
});

/** A minimal SDE with one known attribute, group and effect to reference. */
const mockSde = (modifierInfo: unknown) => {
  loadSdeFiles.mockResolvedValue({
    "dogmaEffects.yaml": { 100: { modifierInfo }, 200: {} },
    "dogmaAttributes.yaml": { 50: {} },
    "groups.yaml": { 60: {} },
  } as never);
};

const runJob = () =>
  // The handler ignores its context, so an empty one is enough.
  ingestSdeDogmaEffectModifiers.handler({} as never);

const createdRows = () =>
  dogmaEffectModifier.createMany.mock.calls.flatMap(
    (call) => (call[0] as { data: Record<string, unknown>[] }).data,
  );

beforeEach(() => {
  dogmaEffectModifier.findMany.mockClear();
  dogmaEffectModifier.createMany.mockClear();
  dogmaEffectModifier.update.mockClear();
  dogmaEffectModifier.updateMany.mockClear();
});

describe("ingestSdeDogmaEffectModifiers", () => {
  it("keys rows by their position in the effect's modifierInfo list", async () => {
    // The SDE gives modifiers no id, so identity is the list index. Two
    // modifiers on one effect must land as index 0 and 1, not collide.
    mockSde([
      { func: "ItemModifier", modifiedAttributeID: 50 },
      { func: "ItemModifier", modifiedAttributeID: 50 },
    ]);

    await runJob();

    expect(createdRows()).toMatchObject([
      { effectId: 100, modifierIndex: 0 },
      { effectId: 100, modifierIndex: 1 },
    ]);
  });

  it("maps the SDE's `operation` onto the `operator` column", async () => {
    mockSde([{ func: "ItemModifier", operation: 6 }]);

    await runJob();

    expect(createdRows()[0]).toMatchObject({
      func: "ItemModifier",
      operator: 6,
    });
  });

  it("nulls optional FKs that point at ids absent from the SDE", async () => {
    // A dangling reference must degrade to null rather than fail the insert for
    // the whole effect. 50/60 are known; 999 is not.
    mockSde([
      {
        func: "LocationGroupModifier",
        modifiedAttributeID: 50,
        modifyingAttributeID: 999,
        groupID: 999,
        effectID: 999,
      },
    ]);

    await runJob();

    expect(createdRows()[0]).toMatchObject({
      modifiedAttributeId: 50,
      modifyingAttributeId: null,
      groupId: null,
      targetEffectId: null,
    });
  });

  it("keeps FKs that do resolve, including a target effect", async () => {
    mockSde([{ func: "EffectStopper", effectID: 200, groupID: 60 }]);

    await runJob();

    expect(createdRows()[0]).toMatchObject({
      targetEffectId: 200,
      groupId: 60,
    });
  });

  it("stores skillTypeId unguarded (the column has no FK)", async () => {
    mockSde([{ func: "LocationRequiredSkillModifier", skillTypeID: 3300 }]);

    await runJob();

    expect(createdRows()[0]).toMatchObject({ skillTypeId: 3300 });
  });

  it("falls back to an empty func when the SDE omits it", async () => {
    // `func` is the one non-null column on the table, so a modifier missing it
    // must still produce a row rather than a Prisma null-constraint failure.
    mockSde([{ modifiedAttributeID: 50 }]);

    await runJob();

    expect(createdRows()[0]).toMatchObject({ func: "" });
  });

  it("emits no rows for an effect without modifierInfo", async () => {
    mockSde(undefined);

    await runJob();

    expect(createdRows()).toEqual([]);
  });
});
