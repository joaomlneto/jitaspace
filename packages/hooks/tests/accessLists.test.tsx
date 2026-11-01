import type { ReactNode } from "react";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

// Type-only, so erased: the modules themselves load lazily below, after the
// mocks are registered.
import type * as AccessListsModule from "../src/hooks/accessLists";
import type * as AuthStoreModule from "../src/hooks/auth/useAuthStore";
import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";

// The real auth store and react-query, with the generated ESI client replaced
// by a fake ESI: `listings` and `details` say what each character may read,
// and every request is recorded so the tests can assert who signed it.
// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below.
interface Detail {
  id: number;
  name: string;
  description: string;
  membership: {
    allow_everyone: boolean;
    characters: { character_id: number; access: string }[];
    corporations: { corporation_id: number; access: string }[];
    alliances: { alliance_id: number; access: string }[];
  };
}

const listings = new Map<number, number[] | Error>();
const details = new Map<number, Detail | Error | Promise<Detail>>();
const requests: { url: string; characterId: number; headers: unknown }[] = [];

const respond = <T,>(value: T | Error | Promise<T> | undefined) => {
  if (value === undefined) return Promise.reject(new Error("404"));
  if (value instanceof Error) return Promise.reject(value);
  return Promise.resolve(value).then((data) => ({ data, headers: {} }));
};

const listingOptions = (
  characterId: number,
  headers?: Record<string, string>,
) => ({
  queryKey: [{ url: "/characters/:character_id/access-lists", characterId }],
  enabled: !!characterId,
  queryFn: () => {
    requests.push({ url: "listing", characterId, headers });
    const ids = listings.get(characterId);
    return respond(
      ids instanceof Error || ids === undefined
        ? ids
        : { access_lists: ids.map((id) => ({ id })) },
    );
  },
});

const detailOptions = (
  accessListId: number,
  characterId: number,
  headers?: Record<string, string>,
) => ({
  queryKey: [
    {
      url: "/characters/:character_id/access-lists/:access_list_id",
      characterId,
      accessListId,
    },
  ],
  enabled: !!accessListId && !!characterId,
  queryFn: () => {
    requests.push({ url: `detail:${accessListId}`, characterId, headers });
    return respond(details.get(accessListId));
  },
});

const mockUseListing = jest.fn();
const mockUseDetail = jest.fn();

jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
  getCharactersAccessListsListingQueryOptions: listingOptions,
  getCharactersAccessListsDetailQueryOptions: detailOptions,
  useGetCharactersAccessListsListing: (...args: unknown[]) =>
    mockUseListing(...args),
  useGetCharactersAccessListsDetail: (...args: unknown[]) =>
    mockUseDetail(...args),
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof AuthStoreModule;
const {
  useCharacterAccessList,
  useCharacterAccessLists,
  useCharactersAccessListDetails,
  useCharactersAccessLists,
} = require("../src/hooks/accessLists") as typeof AccessListsModule;

const SCOPE: ESIScope = "esi-access.read_lists.v1";
const ALICE = 90000001;
const BOB = 90000002;
const CAROL = 90000003;

const character = (
  characterId: number,
  {
    scopes = [SCOPE],
    sessionExpired,
  }: { scopes?: ESIScope[]; sessionExpired?: boolean } = {},
): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId: 1000,
  corporationRoles: [],
  sessionExpired,
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

// Always before the hook renders, so there is nothing for act() to flush.
const login = (...sessions: CharacterSsoSession[]) =>
  useAuthStore.setState({
    characters: Object.fromEntries(sessions.map((s) => [s.characterId, s])),
    selectedCharacter: sessions[0]?.characterId ?? null,
  });

const detail = (id: number, managers: number[] = []): Detail => ({
  id,
  name: `List ${id}`,
  description: `Description ${id}`,
  membership: {
    allow_everyone: false,
    characters: managers.map((character_id) => ({
      character_id,
      access: "Manager",
    })),
    corporations: [],
    alliances: [],
  },
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

const headersOf = (characterId: number) => ({
  Authorization: `Bearer token-${characterId}`,
});

/** The `enabled` flag a single-character hook passed to the generated query. */
const enabledFrom = (mock: jest.Mock) =>
  (mock.mock.calls.at(-1)?.at(-1) as { query: { enabled: boolean } }).query
    .enabled;

beforeAll(async () => {
  // The store is created with skipHydration; the multi-character hooks report
  // pending until it has rehydrated, as they do on a real first paint.
  await useAuthStore.persist.rehydrate();
});

beforeEach(() => {
  listings.clear();
  details.clear();
  requests.length = 0;
  mockUseListing.mockReset().mockReturnValue({ data: undefined });
  mockUseDetail.mockReset().mockReturnValue({ data: undefined });
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  wrapper = makeWrapper();
});

describe("useCharacterAccessLists", () => {
  it("signs with this character's token and fetches", () => {
    login(character(ALICE), character(BOB));

    const { result } = renderHook(() => useCharacterAccessLists(BOB));

    expect(mockUseListing).toHaveBeenCalledWith(
      BOB,
      headersOf(BOB),
      expect.anything(),
    );
    expect(enabledFrom(mockUseListing)).toBe(true);
    expect(result.current.hasToken).toBe(true);
  });

  it("stays disabled when the character has not granted the scope", () => {
    login(character(ALICE, { scopes: [] }));

    const { result } = renderHook(() => useCharacterAccessLists(ALICE));

    expect(enabledFrom(mockUseListing)).toBe(false);
    expect(result.current.hasToken).toBe(false);
  });

  it("stays disabled without a character, rather than querying character 0", () => {
    login(character(ALICE));

    renderHook(() => useCharacterAccessLists(undefined));

    expect(mockUseListing.mock.calls.at(-1)?.[0]).toBe(0);
    expect(enabledFrom(mockUseListing)).toBe(false);
  });

  it("holds the request when not enabled, but still reports the token", () => {
    login(character(ALICE));

    const { result } = renderHook(() =>
      useCharacterAccessLists(ALICE, { enabled: false }),
    );

    expect(enabledFrom(mockUseListing)).toBe(false);
    expect(result.current.hasToken).toBe(true);
  });
});

describe("useCharacterAccessList", () => {
  it("passes the list id first, as the generated hook expects", () => {
    login(character(ALICE));

    const { result } = renderHook(() => useCharacterAccessList(ALICE, 42));

    expect(mockUseDetail).toHaveBeenCalledWith(
      42,
      ALICE,
      headersOf(ALICE),
      expect.anything(),
    );
    expect(enabledFrom(mockUseDetail)).toBe(true);
    expect(result.current.hasToken).toBe(true);
  });

  it.each([
    ["no character", undefined, 42],
    ["no list", ALICE, undefined],
  ])("stays disabled with %s", (_name, characterId, accessListId) => {
    login(character(ALICE));

    renderHook(() => useCharacterAccessList(characterId, accessListId));

    expect(enabledFrom(mockUseDetail)).toBe(false);
  });

  it("stays disabled without a token", () => {
    login(character(ALICE, { sessionExpired: true }));

    const { result } = renderHook(() => useCharacterAccessList(ALICE, 42));

    expect(enabledFrom(mockUseDetail)).toBe(false);
    expect(result.current.hasToken).toBe(false);
  });
});

describe("useCharactersAccessLists", () => {
  it("merges every character's lists, each list once with its managers", async () => {
    login(character(ALICE), character(BOB));
    listings.set(ALICE, [1, 2]);
    listings.set(BOB, [2, 3]);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual([
      { accessListId: 1, characterIds: [ALICE] },
      { accessListId: 2, characterIds: [ALICE, BOB] },
      { accessListId: 3, characterIds: [BOB] },
    ]);
    expect(result.current.characterIds).toEqual([ALICE, BOB]);
    expect(result.current.errors).toEqual([]);
    expect(requests).toEqual([
      { url: "listing", characterId: ALICE, headers: headersOf(ALICE) },
      { url: "listing", characterId: BOB, headers: headersOf(BOB) },
    ]);
  });

  it("queries only the requested characters, in the order requested", async () => {
    login(character(ALICE), character(BOB), character(CAROL));
    listings.set(ALICE, [1]);
    listings.set(BOB, [1]);
    listings.set(CAROL, [1]);

    const { result } = renderHook(
      () => useCharactersAccessLists([CAROL, ALICE, CAROL]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.characterIds).toEqual([CAROL, ALICE]);
    expect(result.current.data).toEqual([
      { accessListId: 1, characterIds: [CAROL, ALICE] },
    ]);
    expect(requests.map((request) => request.characterId)).toEqual([
      CAROL,
      ALICE,
    ]);
  });

  it("leaves out characters that cannot read access lists", async () => {
    login(
      character(ALICE),
      character(BOB, { scopes: [] }),
      character(CAROL, { sessionExpired: true }),
    );
    listings.set(ALICE, [1]);

    const { result } = renderHook(
      () => useCharactersAccessLists([ALICE, BOB, CAROL, 12345]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.characterIds).toEqual([ALICE]);
    expect(requests).toHaveLength(1);
  });

  it("queries nothing for an empty request", () => {
    login(character(ALICE));

    const { result } = renderHook(() => useCharactersAccessLists([]), {
      wrapper,
    });

    expect(result.current.characterIds).toEqual([]);
    expect(result.current.data).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(requests).toEqual([]);
  });

  it("keeps the other characters' lists when one fails, attributing the error", async () => {
    login(character(ALICE), character(BOB));
    listings.set(ALICE, new Error("Forbidden"));
    listings.set(BOB, [3]);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual([
      { accessListId: 3, characterIds: [BOB] },
    ]);
    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toEqual([
      {
        characterId: ALICE,
        error: expect.objectContaining({ message: "Forbidden" }),
      },
    ]);
  });

  it("does not repeat a character that ESI lists a list for twice", async () => {
    login(character(ALICE));
    listings.set(ALICE, [1, 1]);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual([
      { accessListId: 1, characterIds: [ALICE] },
    ]);
  });

  it("reports the characters still loading", async () => {
    login(character(ALICE));
    listings.set(ALICE, [1]);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.pendingCharacterIds).toEqual([ALICE]);
    await waitFor(() => expect(result.current.pendingCharacterIds).toEqual([]));
  });

  it("is pending until the auth store has rehydrated", () => {
    jest.spyOn(useAuthStore.persist, "hasHydrated").mockReturnValue(false);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });

    // No character is known yet, so nothing is loading — but an empty
    // result here is not "no access lists".
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it("refetches every character", async () => {
    login(character(ALICE));
    listings.set(ALICE, [1]);

    const { result } = renderHook(() => useCharactersAccessLists(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    listings.set(ALICE, [1, 2]);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });
});

describe("useCharactersAccessListDetails", () => {
  it("reads each list once, signed by the first character that manages it", async () => {
    login(character(ALICE), character(BOB));
    listings.set(ALICE, [1]);
    listings.set(BOB, [2, 1]);
    details.set(1, detail(1, [ALICE, BOB]));
    details.set(2, detail(2, [BOB]));

    const { result } = renderHook(() => useCharactersAccessListDetails(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual([
      { ...detail(1, [ALICE, BOB]), characterIds: [ALICE, BOB] },
      { ...detail(2, [BOB]), characterIds: [BOB] },
    ]);
    expect(result.current.accessLists).toHaveLength(2);
    const detailRequests = requests.filter((request) =>
      request.url.startsWith("detail:"),
    );
    expect(detailRequests).toEqual([
      { url: "detail:1", characterId: ALICE, headers: headersOf(ALICE) },
      { url: "detail:2", characterId: BOB, headers: headersOf(BOB) },
    ]);
  });

  it("keeps the lists that loaded when one fails, attributing the error", async () => {
    login(character(ALICE));
    listings.set(ALICE, [1, 2]);
    details.set(1, new Error("Not found"));
    details.set(2, detail(2));

    const { result } = renderHook(() => useCharactersAccessListDetails(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data.map((list) => list.id)).toEqual([2]);
    expect(result.current.accessLists.map((list) => list.accessListId)).toEqual(
      [1, 2],
    );
    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toEqual([]);
    expect(result.current.detailErrors).toEqual([
      {
        accessListId: 1,
        characterId: ALICE,
        error: expect.objectContaining({ message: "Not found" }),
      },
    ]);
  });

  it("reports the lists whose details are still loading", async () => {
    login(character(ALICE));
    listings.set(ALICE, [7]);
    let resolveDetail: (value: Detail) => void = () => undefined;
    details.set(
      7,
      new Promise<Detail>((resolve) => {
        resolveDetail = resolve;
      }),
    );

    const { result } = renderHook(() => useCharactersAccessListDetails(), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.pendingAccessListIds).toEqual([7]),
    );
    expect(result.current.isPending).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    act(() => {
      resolveDetail(detail(7));
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.pendingAccessListIds).toEqual([]);
    expect(result.current.data).toHaveLength(1);
  });

  it("carries a listing failure through", async () => {
    login(character(ALICE));
    listings.set(ALICE, new Error("Forbidden"));

    const { result } = renderHook(() => useCharactersAccessListDetails(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.data).toEqual([]);
  });

  it("refetches both the listings and the details", async () => {
    login(character(ALICE));
    listings.set(ALICE, [1]);
    details.set(1, detail(1));

    const { result } = renderHook(() => useCharactersAccessListDetails(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    details.set(1, { ...detail(1), name: "Renamed" });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.data[0]?.name).toBe("Renamed"));
  });
});
