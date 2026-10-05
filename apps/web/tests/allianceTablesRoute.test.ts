/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as RouteModule from "../app/api/alliance/[allianceId]/route";
import type { AllianceProfile } from "~/app/alliance/[allianceId]/types";

const mockReadAllianceProfile =
  jest.fn<(id: number) => Promise<AllianceProfile | null>>();
jest.mock("~/app/alliance/[allianceId]/data", () => ({
  readAllianceProfile: (id: number) => mockReadAllianceProfile(id),
}));

const loadGET = () =>
  (require("../app/api/alliance/[allianceId]/route") as typeof RouteModule).GET;

const get = (allianceId: string) =>
  loadGET()(new Request(`https://www.jita.space/api/alliance/${allianceId}`), {
    params: Promise.resolve({ allianceId }),
  });

const profile: AllianceProfile = {
  allianceId: 99000001,
  name: "A",
  ticker: "A",
  dateFounded: "2010-01-01T00:00:00Z",
  isClosed: false,
  creatorCorporationId: 1,
  creatorCorporationName: "C",
  executorCorporationId: 1,
  executorCorporationName: "C",
  factionId: null,
  factionName: null,
  corporations: [],
  sovereignty: [],
  wars: [],
  warSummary: {
    total: 0,
    asAggressor: 0,
    asDefender: 0,
    asAlly: 0,
    ongoing: 0,
    shipsKilled: 0,
    iskDestroyed: 0,
    shipsLost: 0,
    iskLost: 0,
  },
  readAt: "2026-10-05T12:00:00Z",
};

beforeEach(() => {
  mockReadAllianceProfile.mockReset();
});

describe("GET /api/alliance/[allianceId]", () => {
  it("serves only the table rows, cached at the CDN", async () => {
    mockReadAllianceProfile.mockResolvedValue(profile);
    const res = await get("99000001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      corporations: [],
      sovereignty: [],
      wars: [],
    });
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
  });

  it("404s an alliance we have not stored", async () => {
    mockReadAllianceProfile.mockResolvedValue(null);
    const res = await get("99000001");

    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("rejects an id that is not the canonical spelling", async () => {
    const res = await get("099000001");

    expect(res.status).toBe(400);
    expect(mockReadAllianceProfile).not.toHaveBeenCalled();
  });

  it("lets a database failure throw, so nothing is cached", async () => {
    mockReadAllianceProfile.mockRejectedValue(new Error("down"));
    await expect(get("99000001")).rejects.toThrow("down");
  });
});
