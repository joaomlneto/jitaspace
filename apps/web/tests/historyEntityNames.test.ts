import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// `resolveEntityNames` batches one query per entity kind against our own
// database. Stub Prisma so the tests drive the row shapes and, crucially, can
// assert HOW MANY queries were issued and with which ids.

type Row = Record<string, unknown>;
type FindMany = (args?: { where?: Record<string, unknown> }) => Promise<Row[]>;

const calls: { model: string; ids: number[] }[] = [];
const rowsByModel = new Map<string, Row[]>();
const failing = new Set<string>();

/** A findMany that records the ids it was asked for and replays canned rows. */
const model = (name: string): { findMany: FindMany } => ({
  findMany: (args) => {
    const where = args?.where ?? {};
    const idFilter = Object.values(where)[0] as { in?: number[] } | undefined;
    calls.push({ model: name, ids: idFilter?.in ?? [] });
    if (failing.has(name)) return Promise.reject(new Error("table gone"));
    return Promise.resolve(rowsByModel.get(name) ?? []);
  },
});

jest.mock("~/lib/db", () => ({
  prisma: new Proxy(
    {},
    {
      get: (_t, prop) => (typeof prop === "string" ? model(prop) : undefined),
    },
  ),
}));

const { resolveEntityNames } =
  require("~/lib/history-names") as typeof import("~/lib/history-names");

beforeEach(() => {
  calls.length = 0;
  rowsByModel.clear();
  failing.clear();
});

describe("resolveEntityNames", () => {
  it("resolves each kind from its own table in a single query", async () => {
    rowsByModel.set("type", [
      { typeId: 587, name: "Rifter" },
      { typeId: 588, name: "Reaper" },
    ]);
    rowsByModel.set("region", [{ regionId: 10000002, name: "The Forge" }]);

    const names = await resolveEntityNames([
      { entityType: "type", entityId: 587 },
      { entityType: "type", entityId: 588 },
      { entityType: "region", entityId: 10000002 },
    ]);

    expect(names).toEqual({
      type: { 587: "Rifter", 588: "Reaper" },
      region: { 10000002: "The Forge" },
    });
    expect(calls).toHaveLength(2);
    expect(calls.find((c) => c.model === "type")?.ids).toEqual([587, 588]);
  });

  it("deduplicates ids so an entity touched by several collections is asked for once", async () => {
    rowsByModel.set("type", [{ typeId: 587, name: "Rifter" }]);

    await resolveEntityNames([
      { entityType: "type", entityId: 587 },
      { entityType: "type", entityId: 587 },
      { entityType: "type", entityId: 587 },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.ids).toEqual([587]);
  });

  it("chunks a large id list rather than binding it all into one statement", async () => {
    const ids = Array.from({ length: 2_300 }, (_, i) => i + 1);
    rowsByModel.set("type", []);

    await resolveEntityNames(
      ids.map((id) => ({ entityType: "type", entityId: id })),
    );

    expect(calls).toHaveLength(3);
    expect(calls.map((c) => c.ids.length)).toEqual([1000, 1000, 300]);
  });

  it("prefers displayName over the internal name for dogma attributes", async () => {
    rowsByModel.set("dogmaAttribute", [
      { attributeId: 9, displayName: "Structure Hitpoints", name: "hp" },
      { attributeId: 11, displayName: "   ", name: "powerOutput" },
    ]);

    const names = await resolveEntityNames([
      { entityType: "dogmaAttribute", entityId: 9 },
      { entityType: "dogmaAttribute", entityId: 11 },
    ]);

    expect(names.dogmaAttribute).toEqual({
      9: "Structure Hitpoints",
      11: "powerOutput",
    });
  });

  it("drops blank names instead of rendering an empty label", async () => {
    rowsByModel.set("type", [
      { typeId: 1, name: "   " },
      { typeId: 2, name: "" },
      { typeId: 3, name: null },
      { typeId: 4, name: "Ibis" },
    ]);

    const names = await resolveEntityNames(
      [1, 2, 3, 4].map((id) => ({ entityType: "type", entityId: id })),
    );

    expect(names.type).toEqual({ 4: "Ibis" });
  });

  it("keeps the other kinds when one kind's lookup throws", async () => {
    failing.add("type");
    rowsByModel.set("region", [{ regionId: 10000002, name: "The Forge" }]);

    const names = await resolveEntityNames([
      { entityType: "type", entityId: 587 },
      { entityType: "region", entityId: 10000002 },
    ]);

    expect(names).toEqual({ region: { 10000002: "The Forge" } });
  });

  it("falls back to the history database's own name where our tables have none", async () => {
    rowsByModel.set("type", [{ typeId: 587, name: "Rifter" }]);

    const names = await resolveEntityNames([
      // Our SDE table wins over the recorded name.
      { entityType: "type", entityId: 587, fallbackName: "Stale Rifter" },
      // No row for this one, so the recorded name is all there is.
      { entityType: "type", entityId: 9999, fallbackName: "Brand New Ship" },
      // A kind we cannot name at all (graphics carry only asset paths) still
      // gets its recorded name.
      { entityType: "graphic", entityId: 42, fallbackName: "Rifter hull" },
      // Blank recorded names are ignored.
      { entityType: "graphic", entityId: 43, fallbackName: "  " },
    ]);

    expect(names).toEqual({
      type: { 587: "Rifter", 9999: "Brand New Ship" },
      graphic: { 42: "Rifter hull" },
    });
  });

  it("issues no query for a kind our schema cannot name", async () => {
    await resolveEntityNames([
      { entityType: "graphic", entityId: 42 },
      { entityType: "icon", entityId: 7 },
      { entityType: "notAKind", entityId: 1 },
    ]);
    expect(calls).toHaveLength(0);
  });

  it("names planetary schematics, which do have a table", async () => {
    rowsByModel.set("planetSchematic", [
      { planetSchematicId: 65, name: "Water" },
    ]);

    const names = await resolveEntityNames([
      { entityType: "schematic", entityId: 65 },
    ]);

    expect(names.schematic).toEqual({ 65: "Water" });
    expect(calls.map((c) => c.model)).toEqual(["planetSchematic"]);
  });

  it("ignores non-integer ids and returns an empty map for no refs", async () => {
    const names = await resolveEntityNames([
      { entityType: "type", entityId: Number.NaN },
    ]);
    expect(names).toEqual({});
    expect(await resolveEntityNames([])).toEqual({});
    expect(calls).toHaveLength(0);
  });
});
