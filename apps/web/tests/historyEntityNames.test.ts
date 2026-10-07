import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only import: erased at runtime, so it does NOT load the real
// (Prisma-backed) module; used only to type the lazy require() below.
import type * as EntityNames from "~/lib/history-entity-names";

// Runs every kind's main-database lookup against a stand-in Prisma client that
// answers any model: for each id in the `where … in` filter it returns a row
// whose selected `…Id` fields hold that id and whose other selected fields hold
// `<model>.<field>:<id>`, unless a test overrides the model. So each kind's
// lookup is shown to query by its own id column and to pick its name column.

type Row = Record<string, unknown>;
let mockOverrides: Record<string, (ids: number[]) => Row[]> = {};
const mockQueries: string[] = [];

const mockFindMany = (model: string) => (args: unknown) => {
  const { where, select } = args as {
    where: Record<string, { in: number[] }>;
    select: Record<string, true>;
  };
  const [idField, filter] = Object.entries(where)[0] ?? [];
  if (!idField || !filter) throw new Error(`${model}: no id filter`);
  mockQueries.push(`${model}.${idField}`);
  const override = mockOverrides[model];
  if (override) return Promise.resolve(override(filter.in));
  return Promise.resolve(
    filter.in.map((id) =>
      Object.fromEntries(
        Object.keys(select).map((f) => [
          f,
          f.endsWith("Id") ? id : `${model}.${f}:${id}`,
        ]),
      ),
    ),
  );
};

jest.mock("~/lib/db", () => ({
  prisma: new Proxy(
    {},
    { get: (_, model: string) => ({ findMany: mockFindMany(model) }) },
  ),
}));

const mockQueryRaw = jest.fn((..._args: unknown[]) =>
  Promise.resolve([] as unknown[]),
);
jest.mock("@jitaspace/db-builds", () => ({
  buildsSchema: "public",
  Prisma: { raw: (sql: string) => ({ raw: sql }) },
  buildsDb: { $queryRaw: (...args: unknown[]) => mockQueryRaw(...args) },
}));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock.
const { readEntityNames } =
  require("~/lib/history-entity-names") as typeof EntityNames;

beforeEach(() => {
  mockOverrides = {};
  mockQueries.length = 0;
  mockQueryRaw.mockClear();
});

// Each kind the change lists show, the model and id column it is read from,
// and the column that names it.
const KINDS: [kind: string, model: string, id: string, name: string][] = [
  ["type", "type", "typeId", "name"],
  ["group", "group", "groupId", "name"],
  ["category", "category", "categoryId", "name"],
  ["marketGroup", "marketGroup", "marketGroupId", "name"],
  ["metaGroup", "metaGroup", "metaGroupId", "name"],
  ["typeList", "typeList", "typeListId", "displayName"],
  ["dogmaAttribute", "dogmaAttribute", "attributeId", "displayName"],
  [
    "dogmaAttributeCategory",
    "dogmaAttributeCategory",
    "attributeCategoryId",
    "name",
  ],
  ["dogmaUnit", "dogmaUnit", "unitId", "name"],
  ["dogmaEffect", "dogmaEffect", "effectId", "displayName"],
  ["dbuffCollection", "dbuffCollection", "dbuffCollectionId", "displayName"],
  ["graphic", "graphic", "graphicId", "sofHullName"],
  ["graphicMaterialSet", "graphicMaterialSet", "materialSetId", "description"],
  ["icon", "icon", "iconId", "iconFile"],
  ["faction", "faction", "factionId", "name"],
  ["race", "race", "raceId", "name"],
  ["bloodline", "bloodline", "bloodlineId", "name"],
  ["ancestry", "ancestry", "ancestryId", "name"],
  [
    "corporationActivity",
    "corporationActivity",
    "corporationActivityId",
    "name",
  ],
  ["npcCorporation", "corporation", "corporationId", "name"],
  [
    "npcCorporationDivision",
    "npcCorporationDivision",
    "npcCorporationDivisionId",
    "displayName",
  ],
  ["npcCharacter", "character", "characterId", "name"],
  ["agentInSpace", "character", "characterId", "name"],
  ["agentType", "agentType", "agentTypeId", "name"],
  ["certificate", "certificate", "certificateId", "name"],
  ["mission", "mission", "missionId", "name"],
  ["epicArc", "epicArc", "epicArcId", "name"],
  ["dungeon", "dungeon", "dungeonId", "name"],
  ["archetype", "archetype", "archetypeId", "title"],
  ["schematic", "planetSchematic", "planetSchematicId", "name"],
  [
    "stationOperation",
    "stationOperation",
    "stationOperationId",
    "operationName",
  ],
  ["stationService", "stationService", "stationServiceId", "name"],
  ["region", "region", "regionId", "name"],
  ["constellation", "constellation", "constellationId", "name"],
  ["solarSystem", "solarSystem", "solarSystemId", "name"],
  ["planet", "planet", "planetId", "name"],
  ["moon", "moon", "moonId", "name"],
  ["asteroidBelt", "asteroidBelt", "asteroidBeltId", "name"],
  ["npcStation", "station", "stationId", "name"],
  ["star", "star", "starId", "name"],
  ["stargate", "stargate", "stargateId", "name"],
  ["landmark", "landmark", "landmarkId", "name"],
  ["cloneGrade", "cloneGrade", "cloneGradeId", "name"],
  ["skin", "skin", "skinId", "internalName"],
  ["skinMaterial", "skinMaterial", "skinMaterialId", "displayName"],
];

describe("readEntityNames", () => {
  it.each(KINDS)(
    "names a %s from %s.%s",
    async (kind, model, idField, nameField) => {
      const names = await readEntityNames([
        { entityType: kind, entityId: 7 },
        { entityType: kind, entityId: 8 },
        { entityType: kind, entityId: 7 },
      ]);

      expect(names).toEqual({
        [kind]: { 7: `${model}.${nameField}:7`, 8: `${model}.${nameField}:8` },
      });
      expect(mockQueries).toEqual([`${model}.${idField}`]);
      // Everything named ⇒ the history DB is never asked.
      expect(mockQueryRaw).not.toHaveBeenCalled();
    },
  );

  it("names a secondary sun after its beacon type and its system", async () => {
    mockOverrides.mapSecondarySun = (ids) =>
      ids.map((id) => ({ secondarySunId: id, solarSystemId: 31, typeId: 41 }));
    mockOverrides.solarSystem = () => [{ solarSystemId: 31, name: "J105443" }];
    mockOverrides.type = () => [{ typeId: 41, name: "Pulsar" }];

    expect(
      await readEntityNames([{ entityType: "secondarySun", entityId: 5 }]),
    ).toEqual({ secondarySun: { 5: "Pulsar (J105443)" } });
  });

  it("falls back from a blank display name to the internal one", async () => {
    mockOverrides.dogmaAttribute = (ids) =>
      ids.map((id) => ({
        attributeId: id,
        displayName: " ",
        name: "maxRange",
      }));

    expect(
      await readEntityNames([{ entityType: "dogmaAttribute", entityId: 54 }]),
    ).toEqual({ dogmaAttribute: { 54: "maxRange" } });
  });

  it("names a material set by its faction and pattern without a description", async () => {
    mockOverrides.graphicMaterialSet = (ids) =>
      ids.map((id) => ({
        materialSetId: id,
        description: null,
        sofFactionName: "tetrimon",
        sofPatternName: "tetrimon_trigalvian",
      }));

    expect(
      await readEntityNames([
        { entityType: "graphicMaterialSet", entityId: 1 },
      ]),
    ).toEqual({ graphicMaterialSet: { 1: "tetrimon tetrimon_trigalvian" } });
  });

  it("asks the history DB only with a build to read it at", async () => {
    mockOverrides.type = () => [];

    expect(
      await readEntityNames([{ entityType: "type", entityId: 95741 }]),
    ).toEqual({});
    expect(mockQueryRaw).not.toHaveBeenCalled();

    await readEntityNames([{ entityType: "type", entityId: 95741 }], 3579973);
    // The names rebuilt from its changes, then the name stored on the entity.
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it("falls back to the name the history DB stores on the entity", async () => {
    mockOverrides.dungeon = () => [];
    // No change touches the dungeon's name fields; Entity.name has it.
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { kind: "dungeon", id: "184", name: "Seek and Destroy" },
      ]);

    expect(
      await readEntityNames(
        [{ entityType: "dungeon", entityId: 184 }],
        3586130,
      ),
    ).toEqual({ dungeon: { 184: "Seek and Destroy" } });
  });

  it("asks for stored names only for what is still unnamed", async () => {
    mockOverrides.type = () => [];
    mockQueryRaw.mockResolvedValueOnce([
      { kind: "type", id: "95741", fields: { name: "From its changes" } },
    ]);

    expect(
      await readEntityNames([{ entityType: "type", entityId: 95741 }], 3579973),
    ).toEqual({ type: { 95741: "From its changes" } });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it("treats a change without a kind as a type", async () => {
    expect(await readEntityNames([{ entityId: 587 }])).toEqual({
      type: { 587: "type.name:587" },
    });
  });
});
