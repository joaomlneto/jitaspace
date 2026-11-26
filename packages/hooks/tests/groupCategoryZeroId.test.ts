import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

import type * as UseCategoryModule from "../src/hooks/universe/useCategory";
import type * as UseGroupModule from "../src/hooks/universe/useGroup";
import type * as UseTypeModule from "../src/hooks/universe/useType";

// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below, after the mocks are registered.
const mockFetchSdeRecord = jest.fn((table: string, key: number) =>
  Promise.resolve({ table, key, name: { en: `${table} ${key}` } }),
);
jest.mock("../src/sde/client", () => ({
  __esModule: true,
  fetchSdeRecord: (table: string, key: number) =>
    mockFetchSdeRecord(table, key),
}));
jest.mock("../src/hooks/useEsiAcceptLanguage", () => ({
  __esModule: true,
  useEsiAcceptLanguage: () => "en",
}));

const { QueryClient, QueryClientProvider } =
  require("@tanstack/react-query") as typeof import("@tanstack/react-query");
const { createElement } = require("react") as typeof import("react");
const { useGroup } =
  require("../src/hooks/universe/useGroup") as typeof UseGroupModule;
const { useCategory } =
  require("../src/hooks/universe/useCategory") as typeof UseCategoryModule;
const { useType } =
  require("../src/hooks/universe/useType") as typeof UseTypeModule;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  mockFetchSdeRecord.mockClear();
});

describe.each([
  ["useGroup", () => useGroup, "groups"],
  ["useCategory", () => useCategory, "categories"],
] as const)("%s", (_name, getHook, table) => {
  // Id 0 — "#System", a real group and category — must be fetched; a hook that
  // enabled on `!!id` never did, and its breadcrumbs showed a skeleton forever.
  it("fetches id 0", async () => {
    const { result } = renderHook(() => getHook()(0), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchSdeRecord).toHaveBeenCalledWith(table, 0);
  });

  it("fetches an ordinary id", async () => {
    const { result } = renderHook(() => getHook()(25), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchSdeRecord).toHaveBeenCalledWith(table, 25);
  });

  it("stays idle while the id is unknown", () => {
    renderHook(() => getHook()(undefined), { wrapper });
    expect(mockFetchSdeRecord).not.toHaveBeenCalled();
  });

  it("lets an explicit caller `enabled` win", () => {
    renderHook(() => getHook()(0, { enabled: false }), { wrapper });
    expect(mockFetchSdeRecord).not.toHaveBeenCalled();
  });
});

describe("tables that start at 1", () => {
  it("treat 0 as a placeholder and do not fetch it", () => {
    renderHook(() => useType(0), { wrapper });
    expect(mockFetchSdeRecord).not.toHaveBeenCalled();
  });
});
