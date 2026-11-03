import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as PageModule from "~/app/mercenary-tactical-operations/page";

// The page's server half reads the SDE's operation kinds and hands them to the
// client page, which fetches the characters' operations in the browser. The
// client page is stubbed so the assertions read the props it was given.

const findMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();
const cacheLife = jest.fn();
const cacheTag = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    mercenaryTacticalOperation: { findMany: (a?: unknown) => findMany(a) },
  },
}));
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => cacheLife(...args),
  cacheTag: (...args: unknown[]) => cacheTag(...args),
}));
const probe = () => null;
jest.mock("~/app/mercenary-tactical-operations/page.client", () => ({
  __esModule: true,
  default: probe,
}));

const { default: Page, metadata } =
  require("~/app/mercenary-tactical-operations/page") as typeof PageModule;

const ROGUE_DRONES = {
  dungeonId: 12367,
  name: "Rogue Drone Emergence",
  description: "Destroy all Rogue Drones.",
  anarchyImpact: -20,
  developmentImpact: 10,
  infomorphBonus: 350,
};

/** The props the server half passed to the client page. */
async function clientProps() {
  const adapter = (await Page()) as ReactElement<{ children: ReactElement }>;
  const client = adapter.props.children;
  expect(client.type).toBe(probe);
  return client.props as { kinds: unknown };
}

describe("Mercenary Tactical Operations page (server)", () => {
  beforeEach(() => {
    findMany.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  it("hands the SDE's operation kinds to the client page", async () => {
    findMany.mockResolvedValue([ROGUE_DRONES]);

    expect(await clientProps()).toEqual({ kinds: [ROGUE_DRONES] });
  });

  it("reads only the live kinds, with the fields the page shows", async () => {
    findMany.mockResolvedValue([]);

    await clientProps();

    expect(findMany).toHaveBeenCalledWith({
      select: {
        dungeonId: true,
        name: true,
        description: true,
        anarchyImpact: true,
        developmentImpact: true,
        infomorphBonus: true,
      },
      where: { isDeleted: false },
      orderBy: { mercenaryTacticalOperationId: "asc" },
    });
  });

  it("caches the read until the next SDE ingest", async () => {
    findMany.mockResolvedValue([]);

    await clientProps();

    expect(cacheTag).toHaveBeenCalledWith("sde");
    expect(cacheLife).toHaveBeenCalledWith("max");
  });

  it("lets a database failure throw rather than render a page naming nothing", async () => {
    findMany.mockRejectedValue(new Error("database unavailable"));

    await expect(Page()).rejects.toThrow("database unavailable");
  });

  it("describes itself for search and link previews", () => {
    expect(metadata.title).toBe("Mercenary Tactical Operations");
    expect(metadata.alternates?.canonical).toBe(
      "/mercenary-tactical-operations",
    );
  });
});
