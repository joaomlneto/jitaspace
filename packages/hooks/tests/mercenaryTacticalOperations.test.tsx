import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import type * as AuthModule from "../src/hooks/auth";
import type * as AuthStoreModule from "../src/hooks/auth/useAuthStore";
import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";
import type * as ConstantsModule from "../src/hooks/mercenary/constants";
import type * as DetailModule from "../src/hooks/mercenary/useCharacterMercenaryTacticalOperation";
import type * as ListingModule from "../src/hooks/mercenary/useCharacterMercenaryTacticalOperations";
import type * as MultiModule from "../src/hooks/mercenary/useCharactersMercenaryTacticalOperations";

// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below. The generated ESI client is replaced so axios
// never loads, and so each request can be answered per character.
const mockUseListing = jest.fn();
const mockUseDetail = jest.fn();
type Headers = Record<string, string>;
const mockFetchListing =
  jest.fn<(characterId: number, headers?: Headers) => Promise<unknown>>();
const mockFetchDetail =
  jest.fn<
    (
      operationId: string,
      characterId: number,
      headers?: Headers,
    ) => Promise<unknown>
  >();

jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
  useGetCharactersMercenaryTacticalOperationsListing: (...args: unknown[]) =>
    mockUseListing(...args),
  useGetCharactersMercenaryTacticalOperationsDetail: (...args: unknown[]) =>
    mockUseDetail(...args),
  // Shaped like the generated options: a key naming the request (and, like
  // the generated one, not the token), and a queryFn that performs it with the
  // headers it was built with.
  getCharactersMercenaryTacticalOperationsListingQueryOptions: (
    characterId: number,
    headers: Record<string, string>,
  ) => ({
    queryKey: [{ url: "listing", characterId }],
    queryFn: () => mockFetchListing(characterId, headers),
  }),
  getCharactersMercenaryTacticalOperationsDetailQueryOptions: (
    operationId: string,
    characterId: number,
    headers: Record<string, string>,
  ) => ({
    queryKey: [{ url: "detail", operationId, characterId }],
    queryFn: () => mockFetchDetail(operationId, characterId, headers),
  }),
}));

// Real auth module except for the hydration flag, which tests drive directly,
// and useAccessToken, which the single-character hooks are tested against.
let hasHydrated = true;
const mockUseAccessToken = jest.fn();
jest.mock("../src/hooks/auth", () => {
  const actual = jest.requireActual<typeof AuthModule>("../src/hooks/auth");
  return {
    __esModule: true,
    ...actual,
    useAuthStoreHasHydrated: () => hasHydrated,
    useAccessToken: (...args: Parameters<typeof actual.useAccessToken>) =>
      (mockUseAccessToken.getMockImplementation()
        ? mockUseAccessToken
        : actual.useAccessToken)(...args),
  };
});

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof AuthStoreModule;
const { useCharacterMercenaryTacticalOperations } =
  require("../src/hooks/mercenary/useCharacterMercenaryTacticalOperations") as typeof ListingModule;
const { useCharacterMercenaryTacticalOperation } =
  require("../src/hooks/mercenary/useCharacterMercenaryTacticalOperation") as typeof DetailModule;
const { useCharactersMercenaryTacticalOperations } =
  require("../src/hooks/mercenary/useCharactersMercenaryTacticalOperations") as typeof MultiModule;
const { mercenaryTacticalOperationDetailsStaleTime } =
  require("../src/hooks/mercenary/constants") as typeof ConstantsModule;

const SCOPE: ESIScope = "esi-activities.read_character.v1";
const FIVE_MINUTES = 5 * 60 * 1000;

const ALICE = 90000001;
const BOB = 90000002;
const CAROL = 90000003;

const OPERATION_A = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
const OPERATION_B = "a3c1a2b4-1111-4cb7-9709-7d7de9c20dc7";
const OPERATION_C = "c0ffee00-2222-4cb7-9709-7d7de9c20dc7";
const DEN_1 = 1000000000001;
const DEN_2 = 1000000000002;

const character = ({
  characterId,
  scopes = [SCOPE],
  sessionExpired,
}: {
  characterId: number;
  scopes?: ESIScope[];
  sessionExpired?: boolean;
}): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId: 1000,
  corporationRoles: [],
  ...(sessionExpired ? { sessionExpired } : {}),
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

const listing = (...operations: [id: string, denId: number][]) => ({
  data: {
    operations: operations.map(([id, mercenary_den_id]) => ({
      id,
      mercenary_den_id,
    })),
  },
  headers: {},
});

const detail = (
  id: string,
  over: Partial<{ state: string; dungeon_type_id: number }> = {},
) => ({
  data: {
    id,
    mercenary_den_id: DEN_1,
    state: "Available",
    dungeon_type_id: 12367,
    expires: "2026-11-01T12:00:00Z",
    ...over,
  },
  headers: {},
});

/** Answer each character's listing from a table; unknown ones list nothing. */
const listings = (byCharacter: Record<number, ReturnType<typeof listing>>) =>
  mockFetchListing.mockImplementation((characterId) =>
    Promise.resolve(byCharacter[characterId] ?? listing()),
  );

beforeEach(() => {
  hasHydrated = true;
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  wrapper = makeWrapper();
  mockUseAccessToken.mockReset();
  mockUseListing.mockReset().mockReturnValue({});
  mockUseDetail.mockReset().mockReturnValue({});
  mockFetchListing.mockReset();
  mockFetchDetail
    .mockReset()
    .mockImplementation((operationId) => Promise.resolve(detail(operationId)));
});

describe("useCharacterMercenaryTacticalOperations", () => {
  const HEADERS = { Authorization: "Bearer token" };
  const queryOptions = () =>
    (
      mockUseListing.mock.calls.at(-1)?.[2] as {
        query: { enabled: boolean; staleTime: number };
      }
    ).query;

  it("asks for this character's activities scope and signs with its token", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: HEADERS,
    });

    renderHook(() => useCharacterMercenaryTacticalOperations(ALICE));

    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: ALICE,
      scopes: [SCOPE],
    });
    expect(mockUseListing).toHaveBeenCalledWith(
      ALICE,
      HEADERS,
      expect.anything(),
    );
    expect(queryOptions().enabled).toBe(true);
  });

  it("keeps the listing fresh for as long as ESI caches it", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: HEADERS,
    });

    renderHook(() => useCharacterMercenaryTacticalOperations(ALICE));

    expect(queryOptions().staleTime).toBe(FIVE_MINUTES);
  });

  it("stays disabled without a token", () => {
    mockUseAccessToken.mockReturnValue({ accessToken: null, authHeaders: {} });

    renderHook(() => useCharacterMercenaryTacticalOperations(ALICE));

    expect(queryOptions().enabled).toBe(false);
  });

  it("stays disabled without a character, rather than querying character 0", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: HEADERS,
    });

    renderHook(() => useCharacterMercenaryTacticalOperations());

    expect(queryOptions().enabled).toBe(false);
  });
});

describe("mercenaryTacticalOperationDetailsStaleTime", () => {
  const withState = (state?: string) => ({
    state: { data: state === undefined ? undefined : { data: { state } } },
  });

  it("keeps an operation that is over fresh for good", () => {
    for (const state of ["Completed", "Expired", "Removed"]) {
      expect(mercenaryTacticalOperationDetailsStaleTime(withState(state))).toBe(
        Number.POSITIVE_INFINITY,
      );
    }
  });

  it("refreshes one that can still change as often as ESI does", () => {
    for (const state of ["Available", "Started", "Unspecified", undefined]) {
      expect(mercenaryTacticalOperationDetailsStaleTime(withState(state))).toBe(
        FIVE_MINUTES,
      );
    }
  });
});

describe("useCharacterMercenaryTacticalOperation", () => {
  const HEADERS = { Authorization: "Bearer token" };
  const queryOptions = () =>
    (
      mockUseDetail.mock.calls.at(-1)?.[3] as {
        query: { enabled: boolean; staleTime: number };
      }
    ).query;

  beforeEach(() => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: HEADERS,
    });
  });

  it("passes the operation before the character, as the route declares them", () => {
    renderHook(() =>
      useCharacterMercenaryTacticalOperation(ALICE, OPERATION_A),
    );

    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: ALICE,
      scopes: [SCOPE],
    });
    expect(mockUseDetail).toHaveBeenCalledWith(
      OPERATION_A,
      ALICE,
      HEADERS,
      expect.anything(),
    );
    expect(queryOptions()).toEqual({
      enabled: true,
      staleTime: mercenaryTacticalOperationDetailsStaleTime,
    });
  });

  it("stays disabled without an operation", () => {
    renderHook(() => useCharacterMercenaryTacticalOperation(ALICE));

    expect(queryOptions().enabled).toBe(false);
  });

  it("stays disabled without a character", () => {
    renderHook(() =>
      useCharacterMercenaryTacticalOperation(undefined, OPERATION_A),
    );

    expect(queryOptions().enabled).toBe(false);
  });

  it("stays disabled without a token", () => {
    mockUseAccessToken.mockReturnValue({ accessToken: null, authHeaders: {} });

    renderHook(() =>
      useCharacterMercenaryTacticalOperation(ALICE, OPERATION_A),
    );

    expect(queryOptions().enabled).toBe(false);
  });
});

describe("useCharactersMercenaryTacticalOperations", () => {
  it("merges every character's operations, each with its details", async () => {
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    listings({
      [ALICE]: listing([OPERATION_A, DEN_1]),
      [BOB]: listing([OPERATION_B, DEN_2]),
    });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.characterIds).toEqual([ALICE, BOB]);
    expect(result.current.operations).toEqual([
      {
        operationId: OPERATION_A,
        mercenaryDenId: DEN_1,
        characterIds: [ALICE],
        details: detail(OPERATION_A).data,
      },
      {
        operationId: OPERATION_B,
        mercenaryDenId: DEN_2,
        characterIds: [BOB],
        details: detail(OPERATION_B).data,
      },
    ]);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("lists an operation two characters share once, reading its details once", async () => {
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    listings({
      [ALICE]: listing([OPERATION_A, DEN_1]),
      [BOB]: listing([OPERATION_A, DEN_1], [OPERATION_B, DEN_1]),
    });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(
      result.current.operations.map(({ operationId, characterIds }) => [
        operationId,
        characterIds,
      ]),
    ).toEqual([
      [OPERATION_A, [ALICE, BOB]],
      [OPERATION_B, [BOB]],
    ]);
    // Through the first character listing it, and only through that one.
    expect(
      mockFetchDetail.mock.calls.map(([operationId, characterId]) => [
        operationId,
        characterId,
      ]),
    ).toEqual([
      [OPERATION_A, ALICE],
      [OPERATION_B, BOB],
    ]);
  });

  it("keeps reading a shared operation through the character that got there first", async () => {
    // Bob's listing lands before Alice's. Moving the read to Alice, who comes
    // first in order, would fetch the details again and blank the row.
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    let releaseAlice: (() => void) | undefined;
    mockFetchListing.mockImplementation((characterId) =>
      characterId === ALICE
        ? new Promise((resolve) => {
            releaseAlice = () => resolve(listing([OPERATION_A, DEN_1]));
          })
        : Promise.resolve(listing([OPERATION_A, DEN_1])),
    );

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.operations[0]?.details).toBeDefined(),
    );

    releaseAlice?.();
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.operations[0]?.characterIds).toEqual([ALICE, BOB]);
    expect(result.current.operations[0]?.details).toBeDefined();
    expect(
      mockFetchDetail.mock.calls.map(([operationId, characterId]) => [
        operationId,
        characterId,
      ]),
    ).toEqual([[OPERATION_A, BOB]]);
  });

  it("counts a character listing the same operation twice only once", async () => {
    login(character({ characterId: ALICE }));
    listings({ [ALICE]: listing([OPERATION_A, DEN_1], [OPERATION_A, DEN_1]) });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.operations).toHaveLength(1);
    expect(result.current.operations[0]?.characterIds).toEqual([ALICE]);
  });

  it("signs each character's requests with that character's own token", async () => {
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    listings({ [BOB]: listing([OPERATION_B, DEN_2]) });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    const signedBy = (characterId: number) => ({
      Authorization: `Bearer token-${characterId}`,
    });
    expect(mockFetchListing).toHaveBeenCalledWith(ALICE, signedBy(ALICE));
    expect(mockFetchListing).toHaveBeenCalledWith(BOB, signedBy(BOB));
    expect(mockFetchDetail).toHaveBeenCalledWith(
      OPERATION_B,
      BOB,
      signedBy(BOB),
    );
  });

  it("queries only the characters asked for", async () => {
    login(
      character({ characterId: ALICE }),
      character({ characterId: BOB }),
      character({ characterId: CAROL }),
    );
    listings({
      [ALICE]: listing([OPERATION_A, DEN_1]),
      [BOB]: listing([OPERATION_B, DEN_2]),
    });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations([BOB]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.characterIds).toEqual([BOB]);
    expect(result.current.operations.map((o) => o.operationId)).toEqual([
      OPERATION_B,
    ]);
    expect(mockFetchListing).toHaveBeenCalledTimes(1);
    expect(mockFetchListing.mock.calls[0]?.[0]).toBe(BOB);
    expect(result.current.unavailableCharacterIds).toEqual([]);
  });

  it("queries nothing for an empty list of characters", () => {
    login(character({ characterId: ALICE }));

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations([]),
      { wrapper },
    );

    expect(result.current.characterIds).toEqual([]);
    expect(result.current.operations).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(mockFetchListing).not.toHaveBeenCalled();
  });

  it("reports the characters it cannot query, rather than querying them", async () => {
    login(
      character({ characterId: ALICE }),
      character({ characterId: BOB, scopes: [] }),
      character({ characterId: CAROL, sessionExpired: true }),
    );
    listings({ [ALICE]: listing([OPERATION_A, DEN_1]) });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.characterIds).toEqual([ALICE]);
    expect(result.current.unavailableCharacterIds).toEqual([BOB, CAROL]);
    // A 403 counts against ESI's error budget, so none is risked.
    expect(mockFetchListing).toHaveBeenCalledTimes(1);
  });

  it("reports a requested character that is not logged in as unavailable", () => {
    login(character({ characterId: ALICE }));
    listings({});

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations([ALICE, BOB]),
      { wrapper },
    );

    expect(result.current.characterIds).toEqual([ALICE]);
    expect(result.current.unavailableCharacterIds).toEqual([BOB]);
  });

  it("attributes a failed listing to its character and keeps the others", async () => {
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    const failure = new Error("ESI is down");
    mockFetchListing.mockImplementation((characterId) =>
      characterId === ALICE
        ? Promise.reject(failure)
        : Promise.resolve(listing([OPERATION_B, DEN_2])),
    );

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toEqual([
      { characterId: ALICE, error: failure },
    ]);
    expect(result.current.operations.map((o) => o.operationId)).toEqual([
      OPERATION_B,
    ]);
  });

  it("keeps an operation whose details failed, attributing the failure to it", async () => {
    login(character({ characterId: ALICE }));
    listings({ [ALICE]: listing([OPERATION_A, DEN_1], [OPERATION_C, DEN_1]) });
    const failure = new Error("Forbidden");
    mockFetchDetail.mockImplementation((operationId) =>
      operationId === OPERATION_C
        ? Promise.reject(failure)
        : Promise.resolve(detail(operationId)),
    );

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.errors).toEqual([
      { characterId: ALICE, operationId: OPERATION_C, error: failure },
    ]);
    const failed = result.current.operations.find(
      (operation) => operation.operationId === OPERATION_C,
    );
    expect(failed).toEqual({
      operationId: OPERATION_C,
      mercenaryDenId: DEN_1,
      characterIds: [ALICE],
    });
  });

  it("holds a character pending until its operations' details arrive", async () => {
    login(character({ characterId: ALICE }), character({ characterId: BOB }));
    listings({
      [ALICE]: listing([OPERATION_A, DEN_1]),
      [BOB]: listing([OPERATION_B, DEN_2]),
    });
    let release: (() => void) | undefined;
    mockFetchDetail.mockImplementation((operationId) =>
      operationId === OPERATION_A
        ? new Promise((resolve) => {
            release = () => resolve(detail(operationId));
          })
        : Promise.resolve(detail(operationId)),
    );

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );

    // Bob is done; Alice's listing has landed but its operation has not.
    await waitFor(() =>
      expect(result.current.pendingCharacterIds).toEqual([ALICE]),
    );
    expect(result.current.isPending).toBe(true);
    expect(
      result.current.operations.find((o) => o.operationId === OPERATION_A)
        ?.details,
    ).toBeUndefined();

    release?.();

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.pendingCharacterIds).toEqual([]);
  });

  it("stays pending until the persisted store has rehydrated", () => {
    hasHydrated = false;

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );

    // No characters yet, which on its own would read as "nothing to show".
    expect(result.current.operations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it("does not rebuild its queries for a new array with the same characters", async () => {
    login(character({ characterId: ALICE }));
    listings({ [ALICE]: listing([OPERATION_A, DEN_1]) });

    const { result, rerender } = renderHook(
      () => useCharactersMercenaryTacticalOperations([ALICE]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const operations = result.current.operations;

    rerender();
    rerender();

    expect(result.current.operations).toBe(operations);
    expect(mockFetchListing).toHaveBeenCalledTimes(1);
  });

  it("does not report a failed refetch while the earlier data is still shown", async () => {
    login(character({ characterId: ALICE }));
    listings({ [ALICE]: listing([OPERATION_A, DEN_1]) });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.operations[0]?.details).toBeDefined(),
    );

    mockFetchListing.mockRejectedValue(new Error("ESI is down"));
    mockFetchDetail.mockRejectedValue(new Error("ESI is down"));
    result.current.refetch();
    await waitFor(() => expect(mockFetchDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.errors).toEqual([]);
    expect(result.current.operations[0]?.details).toBeDefined();
  });

  it("refetches every listing and every operation", async () => {
    login(character({ characterId: ALICE }));
    listings({ [ALICE]: listing([OPERATION_A, DEN_1]) });

    const { result } = renderHook(
      () => useCharactersMercenaryTacticalOperations(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockFetchListing).toHaveBeenCalledTimes(1);
    expect(mockFetchDetail).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => expect(mockFetchListing).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockFetchDetail).toHaveBeenCalledTimes(2));
  });
});
