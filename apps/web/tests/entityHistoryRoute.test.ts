/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// GET /api/history/entity/[entityType]/[id] serves an entity's change history
// to the History tab of its page. Those pages are cached whole (ISR) and never
// read the history database themselves, so an outage of it fails the tab only.
// ---------------------------------------------------------------------------

const getCachedEntityHistory =
  jest.fn<(entityType: string, entityId: number) => Promise<unknown>>();

jest.mock("~/lib/history-entity-page", () => ({
  getCachedEntityHistory: (entityType: string, entityId: number) =>
    getCachedEntityHistory(entityType, entityId),
}));

// The primary-key lookup each kind's page 404s on: a row, unless a test says
// the entity does not exist.
const findUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const MODELS = [
  "type",
  "race",
  "faction",
  "station",
  "constellation",
  "region",
  "dungeon",
  "mission",
  "epicArc",
] as const;

jest.mock("~/lib/db", () => ({
  prisma: Object.fromEntries(
    MODELS.map((model) => [
      model,
      {
        findUnique: (args: unknown) =>
          findUnique({ model, ...(args as object) }),
      },
    ]),
  ),
}));

const history = (entityType: string, entityId: number) => ({
  entityType,
  entityId,
  name: "Rifter",
  timeline: null,
  labels: { names: {}, messages: {} },
});

function get(entityType: string, id: string) {
  const { GET } =
    require("~/app/api/history/entity/[entityType]/[id]/route") as {
      GET: (
        request: Request,
        context: { params: Promise<{ entityType: string; id: string }> },
      ) => Promise<Response>;
    };
  return GET(
    new Request(`http://localhost/api/history/entity/${entityType}/${id}`),
    { params: Promise.resolve({ entityType, id }) },
  );
}

describe("GET /api/history/entity/[entityType]/[id]", () => {
  beforeEach(() => {
    getCachedEntityHistory.mockReset();
    findUnique.mockReset();
    findUnique.mockResolvedValue({});
  });

  it.each([
    ["type", 587],
    ["race", 1],
    ["faction", 500_001],
    ["npcStation", 60_003_760],
    ["constellation", 20_000_020],
    ["region", 10_000_002],
    ["dungeon", 1_234],
    ["mission", 5_678],
    ["epicArc", 12],
  ])("serves a %s's history, cached at the CDN", async (entityType, id) => {
    getCachedEntityHistory.mockResolvedValue(history(entityType, id));

    const response = await get(entityType, String(id));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(await response.json()).toEqual(history(entityType, id));
    expect(getCachedEntityHistory).toHaveBeenCalledWith(entityType, id);
  });

  // Every other kind has its own page under /history; an open-ended route
  // would let a crawler mint a cache entry per id of every kind.
  it.each([
    ["skin", "1"],
    ["group", "25"],
    ["Type", "587"],
    ["type", "0"],
    ["type", "0587"],
    ["type", "abc"],
  ])("404s %s/%s without reading", async (entityType, id) => {
    expect((await get(entityType, id)).status).toBe(404);
    expect(findUnique).not.toHaveBeenCalled();
    expect(getCachedEntityHistory).not.toHaveBeenCalled();
  });

  it.each([
    ["type", 587, "type", { typeId: 587 }],
    ["race", 1, "race", { raceId: 1 }],
    ["faction", 500_001, "faction", { factionId: 500_001 }],
    ["npcStation", 60_003_760, "station", { stationId: 60_003_760 }],
    [
      "constellation",
      20_000_020,
      "constellation",
      { constellationId: 20_000_020 },
    ],
    ["region", 10_000_002, "region", { regionId: 10_000_002 }],
    ["dungeon", 1_234, "dungeon", { dungeonId: 1_234 }],
    ["mission", 5_678, "mission", { missionId: 5_678 }],
    ["epicArc", 12, "epicArc", { epicArcId: 12 }],
  ])(
    "looks a %s up by the key its page 404s on",
    async (entityType, id, model, where) => {
      getCachedEntityHistory.mockResolvedValue(history(entityType, id));

      await get(entityType, String(id));

      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ model, where }),
      );
    },
  );

  // A crawler walking ids would otherwise read both databases per id, for a
  // timeline that is always empty.
  it("404s an id no page exists for, cached, without the history read", async () => {
    findUnique.mockResolvedValue(null);

    const response = await get("type", "999999999");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(getCachedEntityHistory).not.toHaveBeenCalled();
  });

  it("lets a main database failure answer 500 rather than cache a 404", async () => {
    findUnique.mockRejectedValue(new Error("main DB down"));

    await expect(get("type", "587")).rejects.toThrow("main DB down");
    expect(getCachedEntityHistory).not.toHaveBeenCalled();
  });

  it("lets a history database failure answer 500 rather than cache it", async () => {
    getCachedEntityHistory.mockRejectedValue(new Error("history DB down"));

    await expect(get("race", "1")).rejects.toThrow("history DB down");
  });
});
