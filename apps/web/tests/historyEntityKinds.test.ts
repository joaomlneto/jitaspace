import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Every entity kind `resolveEntityNames` knows about, with the table it reads
// and the columns it reads from it. `tsc` already proves those columns exist on
// the model; what this pins is the wiring — that each kind reaches the intended
// table, keys its result by the right id, and reads the right name column. A
// kind whose id field is wrong would silently resolve nothing on a real
// database while still type-checking.

type Row = Record<string, unknown>;
type FindMany = (args?: { where?: Record<string, unknown> }) => Promise<Row[]>;

const rowsByModel = new Map<string, Row[]>();

const model = (name: string): { findMany: FindMany } => ({
  findMany: () => Promise.resolve(rowsByModel.get(name) ?? []),
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

/** Kind -> the table it reads and the columns it keys and names by. */
const KINDS = [
  { kind: "type", model: "type", idField: "typeId", nameField: "name" },
  {
    kind: "category",
    model: "category",
    idField: "categoryId",
    nameField: "name",
  },
  { kind: "group", model: "group", idField: "groupId", nameField: "name" },
  {
    kind: "marketGroup",
    model: "marketGroup",
    idField: "marketGroupId",
    nameField: "name",
  },
  {
    kind: "metaGroup",
    model: "metaGroup",
    idField: "metaGroupId",
    nameField: "name",
  },
  {
    kind: "dogmaAttribute",
    model: "dogmaAttribute",
    idField: "attributeId",
    nameField: "displayName",
  },
  {
    kind: "dogmaAttributeCategory",
    model: "dogmaAttributeCategory",
    idField: "attributeCategoryId",
    nameField: "name",
  },
  {
    kind: "dogmaEffect",
    model: "dogmaEffect",
    idField: "effectId",
    nameField: "displayName",
  },
  {
    kind: "dbuffCollection",
    model: "dbuffCollection",
    idField: "dbuffCollectionId",
    nameField: "displayName",
  },
  {
    kind: "faction",
    model: "faction",
    idField: "factionId",
    nameField: "name",
  },
  { kind: "race", model: "race", idField: "raceId", nameField: "name" },
  {
    kind: "bloodline",
    model: "bloodline",
    idField: "bloodlineId",
    nameField: "name",
  },
  {
    kind: "ancestry",
    model: "ancestry",
    idField: "ancestryId",
    nameField: "name",
  },
  {
    kind: "corporationActivity",
    model: "corporationActivity",
    idField: "corporationActivityId",
    nameField: "name",
  },
  {
    kind: "npcCorporation",
    model: "corporation",
    idField: "corporationId",
    nameField: "name",
  },
  {
    kind: "npcCorporationDivision",
    model: "npcCorporationDivision",
    idField: "npcCorporationDivisionId",
    nameField: "name",
  },
  {
    kind: "npcCharacter",
    model: "character",
    idField: "characterId",
    nameField: "name",
  },
  {
    kind: "agentInSpace",
    model: "character",
    idField: "characterId",
    nameField: "name",
  },
  {
    kind: "schematic",
    model: "planetSchematic",
    idField: "planetSchematicId",
    nameField: "name",
  },
  {
    kind: "stationOperation",
    model: "stationOperation",
    idField: "stationOperationId",
    nameField: "operationName",
  },
  {
    kind: "stationService",
    model: "stationService",
    idField: "stationServiceId",
    nameField: "name",
  },
  { kind: "region", model: "region", idField: "regionId", nameField: "name" },
  {
    kind: "constellation",
    model: "constellation",
    idField: "constellationId",
    nameField: "name",
  },
  {
    kind: "solarSystem",
    model: "solarSystem",
    idField: "solarSystemId",
    nameField: "name",
  },
  { kind: "planet", model: "planet", idField: "planetId", nameField: "name" },
  { kind: "moon", model: "moon", idField: "moonId", nameField: "name" },
  {
    kind: "asteroidBelt",
    model: "asteroidBelt",
    idField: "asteroidBeltId",
    nameField: "name",
  },
  {
    kind: "npcStation",
    model: "station",
    idField: "stationId",
    nameField: "name",
  },
  { kind: "star", model: "star", idField: "starId", nameField: "name" },
  {
    kind: "stargate",
    model: "stargate",
    idField: "stargateId",
    nameField: "name",
  },
  {
    kind: "cloneGrade",
    model: "cloneGrade",
    idField: "cloneGradeId",
    nameField: "name",
  },
  { kind: "skin", model: "skin", idField: "skinId", nameField: "internalName" },
  {
    kind: "skinMaterial",
    model: "skinMaterial",
    idField: "skinMaterialId",
    nameField: "displayName",
  },
];

beforeEach(() => {
  rowsByModel.clear();
});

describe("resolveEntityNames covers every kind it claims to", () => {
  it.each(KINDS)(
    "$kind reads $model.$nameField keyed by $idField",
    async ({ kind, model: modelName, idField, nameField }) => {
      rowsByModel.set(modelName, [{ [idField]: 42, [nameField]: "Resolved" }]);

      await expect(
        resolveEntityNames([{ entityType: kind, entityId: 42 }]),
      ).resolves.toEqual({ [kind]: { 42: "Resolved" } });
    },
  );

  it("names nothing for a kind our schema cannot name", async () => {
    // `graphic` and `icon` hold only `res:/…` asset paths, so they are
    // deliberately absent and keep their `#id` label.
    await expect(
      resolveEntityNames([
        { entityType: "graphic", entityId: 1 },
        { entityType: "icon", entityId: 2 },
      ]),
    ).resolves.toEqual({});
  });
});
