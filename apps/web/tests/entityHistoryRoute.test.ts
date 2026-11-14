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
    expect(getCachedEntityHistory).not.toHaveBeenCalled();
  });

  it("lets a history database failure answer 500 rather than cache it", async () => {
    getCachedEntityHistory.mockRejectedValue(new Error("history DB down"));

    await expect(get("race", "1")).rejects.toThrow("history DB down");
  });
});
