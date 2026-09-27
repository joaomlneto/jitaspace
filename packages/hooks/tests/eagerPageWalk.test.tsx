import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";

// The eager page walk, driven through the REAL react-query useInfiniteQuery.
//
// The other suites mock the generated infinite hooks and hand them a constant
// hasNextPage, so they cannot tell a walk that reaches the last page from one
// that stops after page 2 — which is exactly what shipped: every collection
// longer than two pages was truncated, and the current-ship fitting modal,
// which waits for the walk to finish, showed its skeleton forever.
//
// Only the ESI fetchers and the token lookup are mocked. The generated hook is
// replaced by a pass-through to useInfiniteQuery, which is all it does beyond
// supplying defaults that useCharacterAssets overrides anyway. @swc/jest does
// not hoist jest.mock, so the hooks are required lazily below.
const mockGetAssets = jest.fn();
const mockUseAccessToken = jest.fn();
const mockUseCharacterCurrentShip = jest.fn();

jest.mock("@jitaspace/esi-client", () => {
  const { useInfiniteQuery } =
    require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  return {
    __esModule: true,
    getCharactersCharacterIdAssets: (...args: unknown[]) =>
      mockGetAssets(...args),
    getCharactersCharacterIdAssetsInfiniteQueryKey: (id: unknown) => [
      "assets",
      id,
    ],
    useGetCharactersCharacterIdAssetsInfinite: (
      _characterId: unknown,
      _params: unknown,
      _headers: unknown,
      options: { query: Parameters<typeof useInfiniteQuery>[0] },
    ) => useInfiniteQuery(options.query),
  };
});

jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

jest.mock("../src/hooks/location", () => ({
  __esModule: true,
  useCharacterCurrentShip: (...args: unknown[]) =>
    mockUseCharacterCurrentShip(...args),
}));

const { QueryClient, QueryClientProvider, focusManager } =
  require("@tanstack/react-query") as typeof import("@tanstack/react-query");
const { createElement } = require("react") as typeof import("react");
const { useCharacterAssets } =
  require("../src/hooks/assets/useCharacterAssets") as typeof import("../src/hooks/assets/useCharacterAssets");
const { useCharacterCurrentFit } =
  require("../src/hooks/fittings/useCharacterCurrentFit") as typeof import("../src/hooks/fittings/useCharacterCurrentFit");

const CHARACTER_ID = 90000001;
const SHIP_ITEM_ID = 1_000_000_555;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

/** A collection of `total` pages with one fitted module on each. */
function serveAssets(total: number) {
  mockGetAssets.mockReset();
  mockGetAssets.mockImplementation((_id: unknown, params: unknown) => {
    const { page } = params as { page: number };
    return Promise.resolve({
      data: [
        {
          item_id: 100 + page,
          type_id: 2000 + page,
          location_id: SHIP_ITEM_ID,
          location_type: "item",
          location_flag: `HiSlot${page - 1}`,
          quantity: 1,
          is_singleton: true,
        },
      ],
      headers: { "x-pages": String(total) },
    });
  });
}

function setUp(total: number) {
  serveAssets(total);
  mockUseAccessToken.mockReturnValue({
    accessToken: "token",
    authHeaders: { Authorization: "Bearer token" },
    character: null,
  });
  mockUseCharacterCurrentShip.mockReturnValue({
    hasToken: true,
    isLoading: false,
    error: null,
    data: {
      data: {
        ship_item_id: SHIP_ITEM_ID,
        ship_name: "Walker",
        ship_type_id: 587,
      },
    },
  });
}

describe("eager page walk against the real useInfiniteQuery", () => {
  it.each([1, 2, 3, 5])(
    "useCharacterAssets fetches all %i page(s) and then reports none left",
    async (total) => {
      setUp(total);

      const { result } = renderHook(() => useCharacterAssets(CHARACTER_ID), {
        wrapper,
      });

      // Not waitFor(hasNextPage === false): that is also true before the first
      // page lands, so it would pass at mount without testing the walk.
      await waitFor(() =>
        expect(Object.keys(result.current.assets)).toHaveLength(total),
      );
      expect(result.current.hasNextPage).toBe(false);
      expect(mockGetAssets).toHaveBeenCalledTimes(total);
    },
  );

  it("does not re-walk every page when the window regains focus", async () => {
    // A refetch of an infinite query re-requests every page it holds. With
    // the default staleTime of 0 that happened on every focus — alt-tabbing
    // back re-fetched a character's whole asset list.
    setUp(3);
    const { result } = renderHook(() => useCharacterAssets(CHARACTER_ID), {
      wrapper,
    });
    await waitFor(() =>
      expect(Object.keys(result.current.assets)).toHaveLength(3),
    );
    expect(mockGetAssets).toHaveBeenCalledTimes(3);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGetAssets).toHaveBeenCalledTimes(3);
    focusManager.setFocused(undefined);
  });

  it("useCharacterCurrentFit stops loading and shows modules from every page", async () => {
    // The user-visible regression: with more than two pages the walk stalled,
    // hasNextPage stayed true, and isLoading — which waits for the walk — never
    // cleared, so the modal rendered its skeleton and no modules at all.
    setUp(3);

    const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items?.map((item) => item.item_id).sort()).toEqual([
      101, 102, 103,
    ]);
  });
});
