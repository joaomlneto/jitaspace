/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// The route reads static EVE reference data straight out of Prisma; stub the
// client so every lookup is driven from fixtures. `next/cache` is globally
// stubbed (jest.config moduleNameMapper), so the "use cache" directive and
// `cacheLife` are inert here.
type FindUnique = (...args: unknown[]) => Promise<unknown>;

const mockFindUnique = {
  type: jest.fn<FindUnique>(),
  group: jest.fn<FindUnique>(),
  category: jest.fn<FindUnique>(),
  marketGroup: jest.fn<FindUnique>(),
  race: jest.fn<FindUnique>(),
  faction: jest.fn<FindUnique>(),
  dogmaAttribute: jest.fn<FindUnique>(),
  dogmaEffect: jest.fn<FindUnique>(),
  dogmaUnit: jest.fn<FindUnique>(),
  dogmaAttributeCategory: jest.fn<FindUnique>(),
  agent: jest.fn<FindUnique>(),
  researchAgent: jest.fn<FindUnique>(),
};

type PrismaModel = keyof typeof mockFindUnique;

jest.mock("~/lib/db", () => ({
  prisma: Object.fromEntries(
    Object.entries(mockFindUnique).map(([model, fn]) => [
      model,
      { findUnique: (...args: unknown[]) => fn(...args) },
    ]),
  ),
}));

// Loaded lazily (after the mock above is registered) — a top-level import
// would be hoisted above jest.mock and pull in the real Prisma client.
const loadGET = () =>
  (
    require("../app/api/sde/[resource]/[id]/route") as {
      GET: (
        request: Request,
        context: { params: Promise<{ resource: string; id: string }> },
      ) => Promise<Response>;
    }
  ).GET;

const get = (resource: string, id: string) =>
  loadGET()(new Request(`https://jita.space/api/sde/${resource}/${id}`), {
    params: Promise.resolve({ resource, id }),
  });

const TYPE_ROW = {
  typeId: 587,
  name: "Rifter",
  groupId: 25,
  marketGroupId: 61,
};

// An R&D agent: has a research-agent row (with skills) and is out in space.
const AGENT_ROW = {
  characterId: 3018921,
  agentTypeId: 2,
  agentDivisionId: 4,
  isLocator: false,
  level: 3,
  stationId: 60014926,
  AgentDivision: { name: "R&D" },
  Character: { corporationId: 1000002 },
  agentsInSpace: [
    {
      dungeonId: 111,
      solarSystemId: 30000142,
      spawnPointId: 222,
      typeId: 3341,
    },
  ],
};

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

describe("GET /api/sde/[resource]/[id]", () => {
  beforeEach(() => {
    Object.values(mockFindUnique).forEach((fn) =>
      fn.mockReset().mockResolvedValue(null),
    );
    mockFindUnique.type.mockResolvedValue(TYPE_ROW);
  });

  it("returns the selected row for a simple resource, keyed on its own id column", async () => {
    const res = await get("type", "587");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(TYPE_ROW);
    expect(mockFindUnique.type).toHaveBeenCalledWith(
      expect.objectContaining({ where: { typeId: 587 } }),
    );
  });

  it("caches a successful response for a day at the CDN and browser", async () => {
    const res = await get("type", "587");

    expect(res.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
  });

  // Every non-agent resource: the URL segment must reach the right Prisma model
  // and key the lookup on that model's own id column.
  const simpleResources: [
    resource: string,
    model: PrismaModel,
    idField: string,
  ][] = [
    ["type", "type", "typeId"],
    ["group", "group", "groupId"],
    ["category", "category", "categoryId"],
    ["market-group", "marketGroup", "marketGroupId"],
    ["race", "race", "raceId"],
    ["faction", "faction", "factionId"],
    ["dogma-attribute", "dogmaAttribute", "attributeId"],
    ["dogma-effect", "dogmaEffect", "effectId"],
    ["dogma-unit", "dogmaUnit", "unitId"],
    [
      "dogma-attribute-category",
      "dogmaAttributeCategory",
      "attributeCategoryId",
    ],
  ];

  it.each(simpleResources)(
    "reads /%s from prisma.%s keyed on %s",
    async (resource, model, idField) => {
      const row = { [idField]: 42, name: `${resource} 42` };
      mockFindUnique[model].mockResolvedValue(row);

      const res = await get(resource, "42");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(row);
      expect(mockFindUnique[model]).toHaveBeenCalledWith(
        expect.objectContaining({ where: { [idField]: 42 } }),
      );
      expect(mockFindUnique.agent).not.toHaveBeenCalled();
    },
  );

  describe("agent", () => {
    it("flattens the relations and folds in the research-agent skills", async () => {
      mockFindUnique.agent.mockResolvedValue(AGENT_ROW);
      mockFindUnique.researchAgent.mockResolvedValue({
        skills: [{ typeId: 11450 }, { typeId: 11453 }],
      });

      const res = await get("agent", "3018921");

      expect(res.status).toBe(200);
      // The relation shapes (AgentDivision / Character / agentsInSpace) are
      // replaced by flat fields — toEqual asserts they are gone.
      expect(await res.json()).toEqual({
        characterId: 3018921,
        agentTypeId: 2,
        agentDivisionId: 4,
        isLocator: false,
        level: 3,
        stationId: 60014926,
        corporationId: 1000002,
        agentDivisionName: "R&D",
        isResearchAgent: true,
        researchSkills: [11450, 11453],
        agentInSpace: {
          dungeonId: 111,
          solarSystemId: 30000142,
          spawnPointId: 222,
          typeId: 3341,
        },
      });
      expect(mockFindUnique.researchAgent).toHaveBeenCalledWith(
        expect.objectContaining({ where: { characterId: 3018921 } }),
      );
    });

    it("reports a non-research, station-bound agent with empty/null fallbacks", async () => {
      mockFindUnique.agent.mockResolvedValue({
        ...AGENT_ROW,
        agentsInSpace: [],
      });
      mockFindUnique.researchAgent.mockResolvedValue(null);

      const res = await get("agent", "3018921");

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        isResearchAgent: false,
        researchSkills: [],
        agentInSpace: null,
      });
    });

    it("404s an unknown character without looking up its research row", async () => {
      mockFindUnique.agent.mockResolvedValue(null);

      const res = await get("agent", "90000001");

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found" });
      expect(mockFindUnique.researchAgent).not.toHaveBeenCalled();
    });
  });

  it("404s an unknown resource without touching the database", async () => {
    const res = await get("blueprint", "587");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Unknown resource" });
    expect(mockFindUnique.type).not.toHaveBeenCalled();
  });

  it("404s inherited Object properties rather than treating them as resources", async () => {
    const res = await get("toString", "587");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Unknown resource" });
  });

  it.each([
    ["non-numeric", "rifter"],
    ["empty", ""],
    ["zero", "0"],
    ["negative", "-587"],
    ["fractional", "58.7"],
    ["beyond the safe-integer range", "9007199254740993"],
  ])("400s a %s id without touching the database", async (_label, id) => {
    const res = await get("type", id);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id" });
    expect(mockFindUnique.type).not.toHaveBeenCalled();
  });

  it("404s a well-formed id that has no row", async () => {
    mockFindUnique.type.mockResolvedValue(null);

    const res = await get("type", "999999999");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(res.headers.get("Cache-Control")).not.toBe(CACHE_CONTROL);
  });
});
