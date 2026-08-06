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

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { defineMultiEsiValueQuery } =
  require("../src/hooks/multi/defineMultiEsiValueQuery") as typeof import("../src/hooks/multi/defineMultiEsiValueQuery");

const SCOPE: ESIScope = "esi-location.read_location.v1";

interface Location {
  solar_system_id: number;
}

const character = ({
  characterId,
  scopes = [],
}: {
  characterId: number;
  scopes?: ESIScope[];
}): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId: 1000,
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

const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
let wrapper: ReturnType<typeof makeWrapper>;

const response = (data: Location) =>
  ({ data, headers: {} }) as unknown as ResponseConfig<Location>;

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  wrapper = makeWrapper();
});

describe("defineMultiEsiValueQuery", () => {
  it("returns one entry per subject rather than a flattened list", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const useMultiple = defineMultiEsiValueQuery<Location>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["location", subjectId],
        queryFn: () =>
          Promise.resolve(response({ solar_system_id: subjectId * 10 })),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The single object stays whole, paired with its subject — there is nothing
    // to flatten and no per-item tag to attach.
    expect(result.current.data).toEqual([
      { subjectId: 100, data: { solar_system_id: 1000 } },
      { subjectId: 101, data: { solar_system_id: 1010 } },
    ]);
    expect(result.current.subjectIds).toEqual([100, 101]);
    expect(result.current.isError).toBe(false);
  });

  it("omits a failed subject but keeps the others, attributing the error", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const useMultiple = defineMultiEsiValueQuery<Location>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["location", subjectId],
        queryFn: () =>
          subjectId === 100
            ? Promise.reject(new Error("boom"))
            : Promise.resolve(response({ solar_system_id: 7 })),
      }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // data can be shorter than subjectIds, so consumers must pair on subjectId.
    await waitFor(() =>
      expect(result.current.data).toEqual([
        { subjectId: 101, data: { solar_system_id: 7 } },
      ]),
    );
    expect(result.current.subjectIds).toEqual([100, 101]);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]?.subjectId).toBe(100);
  });

  it("does not re-run select on every render", async () => {
    login(character({ characterId: 100, scopes: [SCOPE] }));

    let reads = 0;
    const value = {
      get solar_system_id() {
        reads += 1;
        return 1;
      },
    };

    const useMultiple = defineMultiEsiValueQuery<Location>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({
        queryKey: ["location", subjectId],
        queryFn: () =>
          Promise.resolve({
            data: value,
            headers: {},
          } as unknown as ResponseConfig<Location>),
      }),
    });

    const { result, rerender } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    // Reading the value proves select ran; the count must not climb with
    // renders, or the identity-based memoisation is not hitting.
    const afterInitialFetch = reads;
    rerender();
    rerender();

    expect(reads).toBe(afterInitialFetch);
  });

  it("refetches every subject", async () => {
    login(
      character({ characterId: 100, scopes: [SCOPE] }),
      character({ characterId: 101, scopes: [SCOPE] }),
    );

    const queryFn = jest.fn(() =>
      Promise.resolve(response({ solar_system_id: 1 })),
    );
    const useMultiple = defineMultiEsiValueQuery<Location>({
      kind: "character",
      scopes: [SCOPE],
      query: (subjectId) => ({ queryKey: ["location", subjectId], queryFn }),
    });

    const { result } = renderHook(() => useMultiple(), { wrapper });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    result.current.refetch();

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(4));
  });
});
