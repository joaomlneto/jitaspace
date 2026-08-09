import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type { ResponseConfig } from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";

// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below. The generated ESI client is replaced so axios
// never loads in the test environment.
jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
}));
// Real auth module except for the hydration flag, which tests drive directly:
// there is no public way to put a rehydrated store back into its initial state.
let hasHydrated = true;
jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  ...jest.requireActual<Record<string, unknown>>("../src/hooks/auth"),
  useAuthStoreHasHydrated: () => hasHydrated,
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { defineMultiEsiQuery } =
  require("../src/hooks/multi/defineMultiEsiQuery") as typeof import("../src/hooks/multi/defineMultiEsiQuery");

const SCOPE: ESIScope = "esi-fittings.read_fittings.v1";

interface Fitting {
  fitting_id: number;
}

const character = ({
  characterId,
  corporationId = 0,
  scopes = [],
}: {
  characterId: number;
  corporationId?: number;
  scopes?: ESIScope[];
}): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId,
  corporationRoles: [],
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

// The QueryClient is built per render tree rather than inside the component
// body: a wrapper that constructs it inline throws the cache away on every
// re-render, which quietly breaks any test calling rerender(). It is also
// rebuilt per test, so cached data cannot leak between them.
const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
let wrapper: ReturnType<typeof makeWrapper>;

const response = (data: Fitting[]) =>
  ({ data, headers: {} }) as unknown as ResponseConfig<Fitting[]>;

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  wrapper = makeWrapper();
  hasHydrated = true;
});

describe("defineMultiEsiQuery", () => {
  it("queries every subject and tags each item with its subject id", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn: () =>
          Promise.resolve(response([{ fitting_id: subjectId * 10 }])),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([
      { fitting_id: 1000, subjectId: 100 },
      { fitting_id: 1010, subjectId: 101 },
    ]);
    expect(result.current.subjectIds).toEqual([100, 101]);
    expect(result.current.isError).toBe(false);
  });

  it("passes each subject's own auth headers to its query", async () => {
    login(
      character({ characterId: 100, corporationId: 1000, scopes: [SCOPE] }),
      character({ characterId: 101, corporationId: 2000, scopes: [SCOPE] }),
    );

    const seen: [number, string | undefined][] = [];
    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "corporation",
      scopes: [SCOPE],
      query: (subjectId, authHeaders) => {
        seen.push([subjectId, authHeaders.Authorization]);
        return {
          queryKey: ["corp-assets", subjectId],
          queryFn: () => Promise.resolve(response([])),
        };
      },
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(seen).toContainEqual([1000, "Bearer token-100"]);
    expect(seen).toContainEqual([2000, "Bearer token-101"]);
  });

  it("keeps successful subjects when another one fails", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn: () =>
          subjectId === 100
            ? Promise.reject(new Error("boom"))
            : Promise.resolve(response([{ fitting_id: 1 }])),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() =>
      expect(result.current.data).toEqual([{ fitting_id: 1, subjectId: 101 }]),
    );

    // The failure is attributed to the subject that produced it, so a consumer
    // can say "character 100 failed" rather than just "something failed".
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]?.subjectId).toBe(100);
    expect(result.current.errors[0]?.error).toBeInstanceOf(Error);
  });

  it("does not re-run select on every render", async () => {
    login(character({ characterId: 100, scopes: [SCOPE] }));

    // select does `{ ...item, subjectId }`, so the getter fires once per item
    // per select execution. Reference identity cannot detect this: React Query's
    // structural sharing hands back the previous array either way, so the only
    // observable difference is the work done to get there.
    let spreads = 0;
    const item = {
      get fitting_id() {
        spreads += 1;
        return 1;
      },
    };

    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn: () =>
          Promise.resolve({
            data: [item],
            headers: {},
          } as unknown as ResponseConfig<Fitting[]>),
      }),
    });

    const { result, rerender } = renderHook(() => useMultiple(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    const afterInitialFetch = spreads;
    rerender();
    rerender();
    rerender();

    expect(spreads).toBe(afterInitialFetch);
  });

  it("refetches every subject", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const queryFn = jest.fn(() => Promise.resolve(response([])));
    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn,
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    result.current.refetch();

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(4));
  });

  it("stays pending until the persisted store has rehydrated", () => {
    hasHydrated = false;
    // No characters yet — but that is indistinguishable from "no characters at
    // all" without the hydration flag, and every query reports settled-empty.
    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn: () => Promise.resolve(response([])),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
    // A consumer keying an empty state off isLoading would flash it here.
    expect(result.current.isPending).toBe(true);
  });

  it("settles once hydrated with no eligible characters", () => {
    login(character({ characterId: 100, scopes: [] }));

    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["fittings", subjectId],
        queryFn: () => Promise.resolve(response([])),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });

    // Genuinely empty, not still loading — the empty state is correct now.
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it("issues no queries when no character has the scope", () => {
    login(character({ characterId: 100, scopes: [] }));

    const query = jest.fn(() => ({
      queryKey: ["fittings"],
      queryFn: () => Promise.resolve(response([])),
    }));
    const useMultiple = defineMultiEsiQuery<Fitting>({
      kind: "character",
      scopes: [SCOPE],
      query,
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });

    expect(query).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
    expect(result.current.subjectIds).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
