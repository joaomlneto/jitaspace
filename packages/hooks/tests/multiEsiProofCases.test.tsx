import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type { CharactersCharacterIdRolesGetRolesEnum } from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";

// Wiring tests for the two hooks built on defineMultiEsiQuery. They assert that
// each one hands the generated client the arguments the single-subject hooks
// would — which is what keeps their query keys, and therefore their cache
// entries, identical.
//
// @swc/jest does not hoist jest.mock above imports, so the hooks are required
// lazily below, after these mocks are registered.
const mockFittingsQueryOptions =
  jest.fn<(...args: unknown[]) => Record<string, unknown>>();
const mockGetCorporationAssets =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
  getCharactersCharacterIdFittingsQueryOptions: (...args: unknown[]) =>
    mockFittingsQueryOptions(...args),
  getCorporationsCorporationIdAssets: (...args: unknown[]) =>
    mockGetCorporationAssets(...args),
  getCorporationsCorporationIdAssetsQueryKey: (corporationId: unknown) => [
    { url: "/corporations/:corporation_id/assets", params: { corporationId } },
  ],
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { useMultipleCharacterFittings } =
  require("../src/hooks/fittings/useMultipleCharacterFittings") as typeof import("../src/hooks/fittings/useMultipleCharacterFittings");
const { useMultipleCorporationAssets } =
  require("../src/hooks/assets/useMultipleCorporationAssets") as typeof import("../src/hooks/assets/useMultipleCorporationAssets");

const FITTINGS_SCOPE: ESIScope = "esi-fittings.read_fittings.v1";
const CORP_ASSETS_SCOPE: ESIScope = "esi-assets.read_corporation_assets.v1";

const character = ({
  characterId,
  corporationId = 0,
  scopes = [],
  corporationRoles = [],
}: {
  characterId: number;
  corporationId?: number;
  scopes?: ESIScope[];
  corporationRoles?: CharactersCharacterIdRolesGetRolesEnum[];
}): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId,
  corporationRoles,
  accessTokenPayload: {
    scp: scopes,
    sub: `CHARACTER:EVE:${characterId}`,
    name: `Character ${characterId}`,
    jti: "",
    kid: "",
    azp: "",
    tenant: "",
    tier: "",
    region: "",
    aud: "",
    owner: "",
    exp: 0,
    iat: 0,
    iss: "",
  },
});

const login = (...sessions: CharacterSsoSession[]) =>
  useAuthStore.setState({
    characters: Object.fromEntries(sessions.map((s) => [s.characterId, s])),
    selectedCharacter: sessions[0]?.characterId ?? null,
  });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  mockFittingsQueryOptions.mockReset();
  mockGetCorporationAssets.mockReset();
});

describe("useMultipleCharacterFittings", () => {
  it("builds each query from the generated options, so keys match useCharacterFittings", async () => {
    login(
      character({ characterId: 100, scopes: [FITTINGS_SCOPE] }),
      character({ characterId: 101, scopes: [FITTINGS_SCOPE] }),
    );
    mockFittingsQueryOptions.mockImplementation((characterId) => ({
      queryKey: [{ url: "/characters/:character_id/fittings", characterId }],
      queryFn: () => Promise.resolve({ data: [{ fitting_id: 1 }] }),
    }));

    const { result } = renderHook(() => useMultipleCharacterFittings(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The generated factory is what produces the shared cache key; passing the
    // subject id and that subject's headers straight through is the contract.
    expect(mockFittingsQueryOptions.mock.calls).toContainEqual([
      100,
      { Authorization: "Bearer token-100" },
    ]);
    expect(mockFittingsQueryOptions.mock.calls).toContainEqual([
      101,
      { Authorization: "Bearer token-101" },
    ]);
    expect(result.current.data).toEqual([
      { fitting_id: 1, subjectId: 100 },
      { fitting_id: 1, subjectId: 101 },
    ]);
  });

  it("runs nothing for a character without the fittings scope", () => {
    login(character({ characterId: 100, scopes: [] }));

    const { result } = renderHook(() => useMultipleCharacterFittings(), {
      wrapper,
    });

    expect(mockFittingsQueryOptions).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });
});

describe("useMultipleCorporationAssets", () => {
  it("fetches every page for each corporation with that corporation's token", async () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        corporationRoles: ["Director"],
      }),
      character({
        characterId: 101,
        corporationId: 2000,
        scopes: [CORP_ASSETS_SCOPE],
        corporationRoles: ["Director"],
      }),
    );
    mockGetCorporationAssets.mockImplementation((corporationId, params) => {
      const page = (params as { page: number }).page;
      return Promise.resolve({
        data: [{ item_id: Number(corporationId) + page }],
        headers: { "x-pages": "2" },
      });
    });

    const { result } = renderHook(() => useMultipleCorporationAssets(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Two corporations x two pages, each signed by a member of that corporation.
    expect(mockGetCorporationAssets).toHaveBeenCalledTimes(4);
    for (const [corporationId, characterId] of [
      [1000, 100],
      [2000, 101],
    ]) {
      for (const page of [1, 2]) {
        expect(mockGetCorporationAssets).toHaveBeenCalledWith(
          corporationId,
          { page },
          { Authorization: `Bearer token-${characterId}` },
          expect.anything(),
        );
      }
    }

    expect(result.current.data).toEqual([
      { item_id: 1001, subjectId: 1000 },
      { item_id: 1002, subjectId: 1000 },
      { item_id: 2001, subjectId: 2000 },
      { item_id: 2002, subjectId: 2000 },
    ]);
  });

  it("issues no request for a corporation where nobody holds Director", async () => {
    // The hook declares roles: ["Director"]. Filtering locally is what keeps a
    // non-Director from generating one 403 per corporation, on every one of the
    // role-gated routes, against an API that rate-limits on error rate.
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        corporationRoles: ["Accountant"],
      }),
    );
    mockGetCorporationAssets.mockImplementation(() =>
      Promise.resolve({ data: [], headers: {} }),
    );

    const { result } = renderHook(() => useMultipleCorporationAssets(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetCorporationAssets).not.toHaveBeenCalled();
    expect(result.current.subjectIds).toEqual([]);
  });

  it("queries a corporation once even when several members are logged in", async () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        corporationRoles: ["Director"],
      }),
      character({
        characterId: 101,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        corporationRoles: ["Director"],
      }),
    );
    mockGetCorporationAssets.mockImplementation(() =>
      Promise.resolve({ data: [], headers: {} }),
    );

    const { result } = renderHook(() => useMultipleCorporationAssets(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subjectIds).toEqual([1000]);
    expect(mockGetCorporationAssets).toHaveBeenCalledTimes(1);
  });
});
