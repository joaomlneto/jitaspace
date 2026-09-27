import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// @swc/jest does not hoist jest.mock above imports, so the hook is required
// lazily below.
const mockUseGetMarketsGroupsMarketGroupId = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetMarketsGroupsMarketGroupId: (...args: unknown[]) =>
    mockUseGetMarketsGroupsMarketGroupId(...args),
}));

const { useMarketGroup } =
  require("../src/hooks/market/useMarketGroup") as typeof import("../src/hooks/market/useMarketGroup");

const FRIGATES = { market_group_id: 1, name: "Frigates", parent_group_id: 2 };

describe("useMarketGroup", () => {
  beforeEach(() => {
    mockUseGetMarketsGroupsMarketGroupId.mockReset();
  });

  it("keeps the group's identity between renders", () => {
    // It used to return `{ ...data?.data }` — a fresh object every render, so
    // the breadcrumbs' useMemo over it recomputed every time.
    const response = { data: FRIGATES };
    mockUseGetMarketsGroupsMarketGroupId.mockReturnValue({
      data: response,
      isLoading: false,
      error: null,
    });

    const { result, rerender } = renderHook(() => useMarketGroup(1));
    const first = result.current.data;
    rerender();

    expect(first).toEqual(FRIGATES);
    expect(result.current.data).toBe(first);
  });

  it("tells loading and failure apart from a missing group", () => {
    // All three used to collapse into the same empty object.
    mockUseGetMarketsGroupsMarketGroupId.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    expect(renderHook(() => useMarketGroup(1)).result.current).toEqual({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const failure = new Error("503");
    mockUseGetMarketsGroupsMarketGroupId.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: failure,
    });
    expect(renderHook(() => useMarketGroup(1)).result.current.error).toBe(
      failure,
    );
  });
});
