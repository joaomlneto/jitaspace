/** @jest-environment node */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as WarsFindRoute from "~/app/api/wars/find/route";

const findFirst = jest.fn((_args?: unknown) =>
  Promise.resolve<{ warId: number } | null>({ warId: 712345 }),
);
jest.mock("~/lib/db", () => ({
  prisma: { war: { findFirst: (args: unknown) => findFirst(args) } },
}));

const GET = (query: string) =>
  (require("~/app/api/wars/find/route") as typeof WarsFindRoute).GET(
    new Request(`http://localhost/api/wars/find?${query}`),
  );

beforeEach(() => {
  findFirst.mockClear();
});

describe("GET /api/wars/find", () => {
  it("finds the latest war between the sides declared by the notification's time", async () => {
    const response = await GET(
      "aggressor=99005338&defender=98000001&at=2026-10-08T12:00:00Z",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ warId: 712345 });
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(findFirst).toHaveBeenCalledWith({
      select: { warId: true },
      where: {
        AND: [
          {
            AND: [
              // Legacy ids are shared by alliances and corporations: try both.
              {
                OR: [
                  { aggressorAllianceId: 99005338 },
                  { aggressorCorporationId: 99005338 },
                ],
              },
              {
                OR: [
                  { defenderAllianceId: 98000001 },
                  { defenderCorporationId: 98000001 },
                ],
              },
            ],
          },
          // An hour of slack for the notification arriving before ESI's date.
          { declaredDate: { lte: new Date("2026-10-08T13:00:00Z") } },
        ],
      },
      orderBy: { declaredDate: "desc" },
    });
  });

  it("matches on the declarer alone when the defender is unknown", async () => {
    await GET("aggressor=99005338&at=2026-10-08T12:00:00Z");
    const args = findFirst.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    expect(args.where.AND).toHaveLength(2);
  });

  it("matches the sides either way round when asked", async () => {
    await GET("aggressor=1&defender=2&either=1&at=2026-10-08T12:00:00Z");
    const args = findFirst.mock.calls[0]?.[0] as {
      where: { AND: [{ OR: { AND: { OR: Record<string, number>[] }[] }[] }] };
    };
    const [asGiven, reversed] = args.where.AND[0].OR;
    expect(asGiven?.AND[0]?.OR[0]).toEqual({ aggressorAllianceId: 1 });
    expect(reversed?.AND[0]?.OR[0]).toEqual({ aggressorAllianceId: 2 });
    expect(reversed?.AND[1]?.OR[0]).toEqual({ defenderAllianceId: 1 });
  });

  it("answers 404, cached briefly, when we have no such war", async () => {
    findFirst.mockResolvedValueOnce(null);
    const response = await GET("aggressor=99005338&at=2026-10-08T12:00:00Z");
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it.each([
    ["no aggressor", "at=2026-10-08T12:00:00Z"],
    ["a bad aggressor", "aggressor=abc&at=2026-10-08T12:00:00Z"],
    ["a bad defender", "aggressor=1&defender=-5&at=2026-10-08T12:00:00Z"],
    ["no time", "aggressor=1"],
    ["a bad time", "aggressor=1&at=yesterday"],
    [
      "either way without a defender",
      "aggressor=1&either=1&at=2026-10-08T12:00:00Z",
    ],
  ])("rejects %s without querying", async (_, query) => {
    const response = await GET(query);
    expect(response.status).toBe(400);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("lets a database failure throw", async () => {
    findFirst.mockRejectedValueOnce(new Error("database unreachable"));
    await expect(
      GET("aggressor=99005338&at=2026-10-08T12:00:00Z"),
    ).rejects.toThrow("database unreachable");
  });
});
