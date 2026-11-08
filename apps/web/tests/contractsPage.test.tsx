import type * as NuqsReactModule from "nuqs/adapters/react";
import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";

import type * as PageModule from "../app/contracts/page";

// /contracts: the server shell reads no data. It wraps the browser page in
// nuqs's React adapter, and the open contracts load in the browser.

const mockData = jest.fn();
jest.mock("~/app/contracts/data", () => new Proxy({}, { get: mockData }));
jest.mock("~/app/contracts/page.client", () => ({
  __esModule: true,
  default: () => null,
}));

const page = () => require("../app/contracts/page") as typeof PageModule;

/** Renders the page down to what its Suspense boundary holds. */
function resolve() {
  const boundary = page().default() as ReactElement<{
    children: ReactElement;
  }>;
  const Content = boundary.props.children.type as () => ReactElement<{
    children: ReactElement<Record<string, unknown>>;
  }>;
  return Content();
}

describe("/contracts", () => {
  it("describes itself, canonically", () => {
    expect(page().metadata.title).toBe("Contracts");
    expect(page().metadata.alternates?.canonical).toBe("/contracts");
  });

  it("renders the browser page inside nuqs's React adapter, with no data", () => {
    const adapter = resolve();
    const { NuqsAdapter } = jest.requireActual<typeof NuqsReactModule>(
      "nuqs/adapters/react",
    );
    expect(adapter.type).toBe(NuqsAdapter);
    expect(adapter.props.children.props).toEqual({});
    // Nothing on the server reads the database: the page prerenders whole.
    expect(mockData).not.toHaveBeenCalled();
  });
});
