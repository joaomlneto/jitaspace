import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// useCharacterCurrentFit assembles one fitting out of two independent queries:
// the character's active ship, and the character's assets (the fitted modules
// are just the assets sitting inside that ship). These tests pin the contract
// between those two halves:
//
//  * the combined `isLoading` / `error` the caller keys its skeleton off — an
//    empty module list must be distinguishable from an asset list that is
//    still streaming in;
//  * `includeModules: false`, which must skip the multi-page asset walk
//    entirely (items undefined, assets query disabled) WITHOUT relaxing
//    `hasToken` — the card is still gated on this character's assets scope.
//
// The dependency hooks are mocked (they reach the generated
// @jitaspace/esi-client, which isn't built in this workspace) and, since
// @swc/jest does not hoist jest.mock above imports, the hook under test is
// required lazily.

const mockUseCharacterAssets = jest.fn();
const mockUseAccessToken = jest.fn();
const mockUseCharacterCurrentShip = jest.fn();

jest.mock("../src/hooks/assets", () => ({
  __esModule: true,
  useCharacterAssets: (...args: unknown[]) => mockUseCharacterAssets(...args),
}));

jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

jest.mock("../src/hooks/location", () => ({
  __esModule: true,
  useCharacterCurrentShip: (...args: unknown[]) =>
    mockUseCharacterCurrentShip(...args),
}));

const { useCharacterCurrentFit } =
  require("../src/hooks/fittings/useCharacterCurrentFit") as typeof import("../src/hooks/fittings/useCharacterCurrentFit");

const CHARACTER_ID = 2116129465;
const SHIP_ITEM_ID = 1041234567890;
const ASSETS_SCOPE = "esi-assets.read_assets.v1";

/** GET /characters/{id}/ship/, wrapped the way the generated client returns it. */
const SHIP = {
  data: {
    ship_item_id: SHIP_ITEM_ID,
    ship_name: "Corvus",
    ship_type_id: 17738,
  },
};

/** Assets shaped like GET /characters/{id}/assets/ entries. */
const FITTED_HIGH_SLOT = {
  item_id: 1041000000001,
  type_id: 2929,
  location_id: SHIP_ITEM_ID,
  location_flag: "HiSlot0",
  location_type: "item",
  quantity: 1,
  is_singleton: true,
};

const FITTED_CARGO = {
  item_id: 1041000000002,
  type_id: 12608,
  location_id: SHIP_ITEM_ID,
  location_flag: "Cargo",
  location_type: "item",
  quantity: 200,
  is_singleton: false,
};

/** Sits in a station hangar, not in the ship — must not show up as a module. */
const HANGAR_ITEM = {
  item_id: 1041000000003,
  type_id: 34,
  location_id: 60003760,
  location_flag: "Hangar",
  location_type: "station",
  quantity: 5000,
  is_singleton: false,
};

const ALL_ASSETS = {
  [FITTED_HIGH_SLOT.item_id]: FITTED_HIGH_SLOT,
  [FITTED_CARGO.item_id]: FITTED_CARGO,
  [HANGAR_ITEM.item_id]: HANGAR_ITEM,
};

function mockShip(
  overrides: {
    hasToken?: boolean;
    data?: typeof SHIP | undefined;
    isLoading?: boolean;
    error?: Error | null;
  } = {},
) {
  mockUseCharacterCurrentShip.mockReturnValue({
    hasToken: true,
    data: SHIP,
    isLoading: false,
    error: null,
    ...overrides,
  });
}

function mockAssets(
  overrides: {
    hasToken?: boolean;
    assets?: Record<string, unknown>;
    isLoading?: boolean;
    hasNextPage?: boolean;
    error?: Error | null;
  } = {},
) {
  mockUseCharacterAssets.mockReturnValue({
    hasToken: true,
    assets: ALL_ASSETS,
    locations: {},
    isLoading: false,
    // The assets query settles once its FIRST page lands and walks the rest
    // eagerly, so `hasNextPage` is the flag that says the collection is still
    // incomplete. Default to a fully-walked collection.
    hasNextPage: false,
    error: null,
    ...overrides,
  });
}

describe("useCharacterCurrentFit", () => {
  beforeEach(() => {
    // clearMocks wipes calls but keeps implementations, so reset explicitly.
    mockUseCharacterAssets.mockReset();
    mockUseAccessToken.mockReset();
    mockUseCharacterCurrentShip.mockReset();

    mockShip();
    mockAssets();
    // The logged-in character holds the assets scope.
    mockUseAccessToken.mockReturnValue({
      character: { characterId: CHARACTER_ID },
      accessToken: "assets-token",
      authHeaders: { Authorization: "Bearer assets-token" },
    });
  });

  describe("isLoading", () => {
    it("is true while the ship query is still resolving", () => {
      mockShip({ data: undefined, isLoading: true });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toBeUndefined();
    });

    it("is true while the assets are still streaming in, even once the ship has resolved", () => {
      // The first asset page has not landed yet: the ship is known, but the
      // module list is empty for the moment. Without isLoading this is
      // indistinguishable from a ship that genuinely has nothing fitted.
      mockAssets({ assets: {}, isLoading: true });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("is false once both queries have settled", () => {
      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.isLoading).toBe(false);
    });

    it("stays true while the eager walk is still fetching later asset pages", () => {
      // react-query settles an infinite query as soon as page one lands — the
      // remaining pages are fetched by useCharacterAssets' eager effect and
      // report through isFetchingNextPage, not isLoading. Modules are filtered
      // out of the WHOLE collection, so a fit built from page one alone is
      // missing whatever sits on the pages still in flight. Keying the skeleton
      // off isLoading alone would hand over to a half-populated module list.
      mockAssets({ isLoading: false, hasNextPage: true });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.isLoading).toBe(true);
    });

    it("stops waiting on the walk once a page has failed", () => {
      // A failed page leaves hasNextPage true forever; without the error term
      // the card would sit on the skeleton for the rest of the session instead
      // of surfacing the failure.
      mockAssets({
        isLoading: false,
        hasNextPage: true,
        error: new Error("page 3 failed"),
      });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it("ignores an unfinished asset walk when includeModules is false", () => {
      mockAssets({ isLoading: true, hasNextPage: true });

      const { result } = renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("error", () => {
    it("surfaces the ship query failure", () => {
      const shipError = new Error("ship request failed");
      mockShip({ data: undefined, error: shipError });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.error).toBe(shipError);
    });

    it("surfaces the assets failure when the ship itself resolved", () => {
      const assetsError = new Error("assets request failed");
      mockAssets({ assets: {}, error: assetsError });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.name).toBe("Corvus");
      expect(result.current.error).toBe(assetsError);
    });

    it("is null when both queries are healthy", () => {
      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.error).toBeNull();
    });
  });

  describe("includeModules: false", () => {
    it("leaves items undefined and ignores the assets query state", () => {
      // Whatever the assets query is doing, a header-only caller must not be
      // told to render a skeleton or an error for modules it never asked for.
      mockAssets({
        assets: {},
        isLoading: true,
        error: new Error("assets request failed"),
      });

      const { result } = renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      expect(result.current.items).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      // The ship header is still populated.
      expect(result.current.name).toBe("Corvus");
      expect(result.current.shipTypeId).toBe(17738);
    });

    it("disables the assets query by passing no character id", () => {
      renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      // The hook is still called unconditionally, but with `undefined` so the
      // multi-page asset walk never starts.
      expect(mockUseCharacterAssets).toHaveBeenCalledWith(undefined);
      expect(mockUseCharacterAssets).not.toHaveBeenCalledWith(CHARACTER_ID);
    });

    it("still reads THIS character's assets token, so hasToken does not widen", () => {
      // The assets query is disabled, so its own hasToken says nothing useful.
      mockAssets({ hasToken: false, assets: {} });

      const { result } = renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      expect(mockUseAccessToken).toHaveBeenCalledWith({
        characterId: CHARACTER_ID,
        scopes: [ASSETS_SCOPE],
      });
      expect(result.current.hasToken).toBe(true);
    });

    it("reports no token when only another character holds the assets scope", () => {
      // useCharacterAssets(undefined) would happily authorise with any
      // logged-in character; gating the card on that would show one
      // character's fit under another character's name.
      mockUseAccessToken.mockReturnValue({
        character: null,
        accessToken: null,
        authHeaders: {},
      });
      mockAssets({ hasToken: true, assets: {} });

      const { result } = renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      expect(result.current.hasToken).toBe(false);
    });

    it("requires the ship scope as well", () => {
      mockShip({ hasToken: false, data: undefined });

      const { result } = renderHook(() =>
        useCharacterCurrentFit(CHARACTER_ID, { includeModules: false }),
      );

      expect(result.current.hasToken).toBe(false);
    });
  });

  describe("items", () => {
    it("keeps only the assets inside the active ship, carrying location_flag through", () => {
      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.items).toEqual([
        { ...FITTED_HIGH_SLOT, location_flag: "HiSlot0" },
        { ...FITTED_CARGO, location_flag: "Cargo" },
      ]);
      // The station hangar stack is not part of the fit.
      expect(
        result.current.items?.some(
          (item) => item.item_id === HANGAR_ITEM.item_id,
        ),
      ).toBe(false);
    });

    it("is undefined until the ship is known, so no asset can be mistaken for a module", () => {
      mockShip({ data: undefined, isLoading: true });

      const { result } = renderHook(() => useCharacterCurrentFit(CHARACTER_ID));

      expect(result.current.items).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
    });
  });
});
