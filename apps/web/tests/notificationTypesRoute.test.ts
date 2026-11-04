/** @jest-environment node */

import { describe, expect, it, jest } from "@jest/globals";

import type * as NotificationTypesRoute from "~/app/api/notification-types/route";

const findMany = jest.fn((_args?: unknown) =>
  Promise.resolve([
    {
      internalName: "CorpAppInvitedMsg",
      displayName: "Corporation Invitation",
    },
    { internalName: "KillReportVictim", displayName: "Kill report - Victim" },
    { internalName: "FreelanceProjectACLDeleted", displayName: null },
  ]),
);
jest.mock("~/lib/db", () => ({
  prisma: { notificationType: { findMany: (args: unknown) => findMany(args) } },
}));
jest.mock("~/lib/sdeCache", () => ({
  cacheSdeRead: () => undefined,
  SDE_CACHE_TAG: "sde",
}));

const loadRoute = () =>
  require("~/app/api/notification-types/route") as typeof NotificationTypesRoute;

describe("GET /api/notification-types", () => {
  it("maps each live type's internal name to its display name", async () => {
    const response = await loadRoute().GET();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
    expect(response.headers.get("Cache-Control")).toContain("public");
    // The type without a display name is left for the client to humanize.
    expect(await response.json()).toEqual({
      CorpAppInvitedMsg: "Corporation Invitation",
      KillReportVictim: "Kill report - Victim",
    });
  });

  it("lets a database failure throw rather than serve an empty map", async () => {
    findMany.mockRejectedValueOnce(new Error("database unreachable"));
    await expect(loadRoute().GET()).rejects.toThrow("database unreachable");
  });
});
