import type * as NuqsReactModule from "nuqs/adapters/react";
import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";

import type * as PageModule from "../app/contracts/page";
import type { OpenContractsOverview } from "~/app/contracts/data";

// /contracts: the server shell reads the cached overview and hands it to the
// browser under nuqs's React adapter.

const mockReadOverview = jest.fn<() => Promise<OpenContractsOverview>>();
jest.mock("~/app/contracts/data", () => ({
  readOpenContractsOverview: () => mockReadOverview(),
}));
jest.mock("~/app/contracts/page.client", () => ({
  __esModule: true,
  default: () => null,
}));

const page = () => require("../app/contracts/page") as typeof PageModule;

/** Renders the page down to what its Suspense boundary resolves to. */
async function resolve() {
  const boundary = page().default() as ReactElement<{
    children: ReactElement;
  }>;
  const Content = boundary.props.children.type as () => Promise<
    ReactElement<{ children: ReactElement<{ overview: unknown }> }>
  >;
  return Content();
}

const OVERVIEW: OpenContractsOverview = {
  regions: [{ regionId: 10000002, name: "The Forge", count: 3 }],
  total: 3,
  snapshotAt: "2026-11-04T11:00:00.000Z",
  isBackfilling: false,
};

describe("/contracts", () => {
  it("describes itself, canonically", () => {
    expect(page().metadata.title).toBe("Contracts");
    expect(page().metadata.alternates?.canonical).toBe("/contracts");
  });

  it("hands the browser the overview, inside nuqs's React adapter", async () => {
    mockReadOverview.mockResolvedValue(OVERVIEW);
    const adapter = await resolve();
    const { NuqsAdapter } = jest.requireActual<typeof NuqsReactModule>(
      "nuqs/adapters/react",
    );
    expect(adapter.type).toBe(NuqsAdapter);
    expect(adapter.props.children.props.overview).toBe(OVERVIEW);
  });

  it("lets a database failure throw rather than cache an empty browser", async () => {
    mockReadOverview.mockRejectedValue(new Error("db down"));
    await expect(resolve()).rejects.toThrow("db down");
  });
});
