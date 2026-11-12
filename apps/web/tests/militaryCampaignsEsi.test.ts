import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as EsiModule from "~/app/military-campaigns/esi";

const mockCacheLife = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}));

const mockListing = jest.fn<() => Promise<unknown>>();
const mockObjectives =
  jest.fn<(id: string, params: { after: string }) => Promise<unknown>>();
jest.mock("@jitaspace/esi-client", () => ({
  ...jest.requireActual<object>("@jitaspace/esi-client"),
  getMilitaryCampaignsListing: () => mockListing(),
  getMilitaryCampaignsObjectivesListing: (
    id: string,
    params: { after: string },
  ) => mockObjectives(id, params),
}));

const { readMilitaryCampaigns } =
  require("~/app/military-campaigns/esi") as typeof EsiModule;

const objective = (id: string) => ({
  id,
  state: "Completed",
  progress: 5,
  participants: { total: 3, committed: 1, contributors: 2 },
  started: "2026-09-01T00:00:00Z",
  last_modified: "2026-09-02T00:00:00Z",
});

describe("readMilitaryCampaigns", () => {
  beforeEach(() => {
    mockCacheLife.mockReset();
    mockListing.mockReset();
    mockObjectives.mockReset();
  });

  it("reads every campaign with all of its objectives, walking `after` from the start", async () => {
    mockListing.mockResolvedValue({
      data: {
        campaigns: [
          {
            id: "c1",
            state: "Active",
            progress: 3,
            started: "2026-06-09T00:00:00Z",
          },
        ],
      },
    });
    mockObjectives.mockResolvedValue({
      data: {
        objectives: [objective("o1"), objective("o2")],
        cursor: { after: "x" },
      },
    });

    const snapshot = await readMilitaryCampaigns();

    expect(snapshot?.campaigns).toHaveLength(1);
    expect(snapshot?.campaigns[0]?.objectives.map((o) => o.id)).toEqual([
      "o1",
      "o2",
    ]);
    expect(snapshot?.campaigns[0]?.finished).toBeNull();
    expect(mockObjectives).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ after: "0" }),
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockCacheLife).not.toHaveBeenCalledWith("seconds");
  });

  it("returns null on an ESI failure, and keeps that answer for seconds only", async () => {
    // A throw here would kill the build's prerender of this static page
    // (a catch outside the cache scope does not contain it), so any deploy
    // during ESI's downtime would fail.
    mockListing.mockRejectedValue(new Error("HTTP 503"));
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await expect(readMilitaryCampaigns()).resolves.toBeNull();

    expect(mockCacheLife).toHaveBeenLastCalledWith("seconds");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns null when any one campaign's objectives fail, rather than a partial list", async () => {
    mockListing.mockResolvedValue({
      data: { campaigns: [{ id: "c1", state: "Active", progress: 3 }] },
    });
    mockObjectives.mockRejectedValue(new Error("HTTP 502"));
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await expect(readMilitaryCampaigns()).resolves.toBeNull();
    warn.mockRestore();
  });
});
