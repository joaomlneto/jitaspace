import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

// useTypes / useDogmaAttributes against a real QueryClient. The ESI fetchers
// are mocked both as generated query options (what the hooks use now) and as
// the raw request functions (what they used before), so the same assertions
// run against either implementation. @swc/jest does not hoist jest.mock, so
// the hooks are required lazily.
const mockGetType =
  jest.fn<
    (id: number) => Promise<{ data: { type_id: number; name: string } }>
  >();
const mockGetAttribute =
  jest.fn<
    (id: number) => Promise<{ data: { attribute_id: number; name: string } }>
  >();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getUniverseTypesTypeId: (id: number) => mockGetType(id),
  getUniverseTypesTypeIdQueryOptions: (id: number) => ({
    queryKey: ["type", id],
    queryFn: () => mockGetType(id),
  }),
  getDogmaAttributesAttributeId: (id: number) => mockGetAttribute(id),
  getDogmaAttributesAttributeIdQueryOptions: (id: number) => ({
    queryKey: ["attribute", id],
    queryFn: () => mockGetAttribute(id),
  }),
}));

const { QueryClient, QueryClientProvider } =
  require("@tanstack/react-query") as typeof import("@tanstack/react-query");
const { createElement } = require("react") as typeof import("react");
const { useTypes } =
  require("../src/hooks/universe/useTypes") as typeof import("../src/hooks/universe/useTypes");
const { useDogmaAttributes } =
  require("../src/hooks/dogma/useDogmaAttributes") as typeof import("../src/hooks/dogma/useDogmaAttributes");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

const TYPE_IDS = [587, 588, 589];

describe("useTypes", () => {
  beforeEach(() => {
    mockGetType.mockReset();
    mockGetType.mockImplementation((id) =>
      Promise.resolve({ data: { type_id: id, name: `Type ${id}` } }),
    );
  });

  it("returns every type keyed by its id", async () => {
    const { result } = renderHook(() => useTypes(TYPE_IDS), { wrapper });

    await waitFor(() =>
      expect(Object.keys(result.current.data)).toHaveLength(3),
    );
    expect(result.current.data[588]).toEqual({
      type_id: 588,
      name: "Type 588",
    });
  });

  it("keeps the types that resolved when one of them fails", async () => {
    // The Promise.all this replaced discarded every response when any one id
    // failed, so the /compare table rendered empty until the selection changed.
    mockGetType.mockImplementation((id) =>
      id === 588
        ? Promise.reject(new Error("ESI 502"))
        : Promise.resolve({ data: { type_id: id, name: `Type ${id}` } }),
    );

    const { result } = renderHook(() => useTypes(TYPE_IDS), { wrapper });

    await waitFor(() =>
      expect(Object.keys(result.current.data).sort()).toEqual(["587", "589"]),
    );
    await waitFor(() => expect(result.current.errors).toHaveLength(1));
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useDogmaAttributes", () => {
  it("returns every attribute keyed by its id", async () => {
    mockGetAttribute.mockImplementation((id) =>
      Promise.resolve({ data: { attribute_id: id, name: `attr${id}` } }),
    );

    const { result } = renderHook(() => useDogmaAttributes([9, 37]), {
      wrapper,
    });

    await waitFor(() =>
      expect(Object.keys(result.current.data).sort()).toEqual(["37", "9"]),
    );
  });
});
