import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// The character-scoped infinite hooks each build an explicit, marker-suffixed
// query key so their InfiniteData cannot land on the single-page entry for the
// same endpoint. Their corporation/alliance siblings are covered by
// corporationAllianceInfiniteHooks.test.tsx; this pins the key each of these
// four passes, which is the line this change touches and the one whose failure
// mode is silent.
//
// @swc/jest does not hoist jest.mock above imports, so the generated client is
// mocked here and the hooks are required lazily below.
const mockUseAccessToken = jest.fn();
const infiniteHook = () =>
  jest.fn<(...args: unknown[]) => Record<string, unknown>>(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }));

const mockAssetsInfinite = infiniteHook();
const mockContactsInfinite = infiniteHook();
const mockCalendarInfinite = infiniteHook();
const mockMailInfinite = infiniteHook();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getCharactersCharacterIdAssets: jest.fn(),
  getCharactersCharacterIdContacts: jest.fn(),
  getCharactersCharacterIdMail: jest.fn(),
  // Real-looking keys: what matters is that each endpoint gets a distinct one
  // and that the hook appends the marker rather than inventing its own key.
  getCharactersCharacterIdAssetsInfiniteQueryKey: (id: unknown) => [
    { url: "/characters/:character_id/assets", params: { character_id: id } },
  ],
  getCharactersCharacterIdContactsInfiniteQueryKey: (id: unknown) => [
    { url: "/characters/:character_id/contacts", params: { character_id: id } },
  ],
  getCharactersCharacterIdCalendarInfiniteQueryKey: (id: unknown) => [
    { url: "/characters/:character_id/calendar", params: { character_id: id } },
  ],
  getCharactersCharacterIdMailInfiniteQueryKey: (
    id: unknown,
    params: unknown,
  ) => [
    { url: "/characters/:character_id/mail", params: { character_id: id } },
    params,
  ],
  useGetCharactersCharacterIdAssetsInfinite: (...a: unknown[]) =>
    mockAssetsInfinite(...a),
  useGetCharactersCharacterIdContactsInfinite: (...a: unknown[]) =>
    mockContactsInfinite(...a),
  useGetCharactersCharacterIdCalendarInfinite: (...a: unknown[]) =>
    mockCalendarInfinite(...a),
  useGetCharactersCharacterIdMailInfinite: (...a: unknown[]) =>
    mockMailInfinite(...a),
  useGetCharactersCharacterIdContactsLabels: () => ({ data: undefined }),
}));

jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

const { useCharacterAssets } =
  require("../src/hooks/assets/useCharacterAssets") as typeof import("../src/hooks/assets/useCharacterAssets");
const { useCharacterContacts } =
  require("../src/hooks/contacts/useCharacterContacts") as typeof import("../src/hooks/contacts/useCharacterContacts");
const { useCharacterCalendar } =
  require("../src/hooks/calendar/useCharacterCalendar") as typeof import("../src/hooks/calendar/useCharacterCalendar");
const { useCharacterMails } =
  require("../src/hooks/mail/useCharacterMails") as typeof import("../src/hooks/mail/useCharacterMails");
const { INFINITE_QUERY_KEY_MARKER } =
  require("../src/hooks/utils/esiInfiniteQueryKey") as typeof import("../src/hooks/utils/esiInfiniteQueryKey");

const CHARACTER_ID = 90000001;

/** The `queryKey` the hook handed to its generated infinite hook. */
function queryKeyFrom(mock: ReturnType<typeof infiniteHook>): unknown[] {
  const options = mock.mock.calls[0]?.at(-1) as {
    query?: { queryKey?: unknown[] };
  };
  return options.query?.queryKey ?? [];
}

beforeEach(() => {
  mockUseAccessToken.mockReset().mockReturnValue({
    accessToken: "token",
    authHeaders: { Authorization: "Bearer token" },
  });
});

describe("character infinite hooks key their own cache entry", () => {
  const cases: {
    name: string;
    mock: ReturnType<typeof infiniteHook>;
    render: () => unknown;
    url: string;
  }[] = [
    {
      name: "assets",
      mock: mockAssetsInfinite,
      render: () => useCharacterAssets(CHARACTER_ID),
      url: "/characters/:character_id/assets",
    },
    {
      name: "contacts",
      mock: mockContactsInfinite,
      render: () => useCharacterContacts(CHARACTER_ID),
      url: "/characters/:character_id/contacts",
    },
    {
      name: "calendar",
      mock: mockCalendarInfinite,
      render: () => useCharacterCalendar(CHARACTER_ID),
      url: "/characters/:character_id/calendar",
    },
    {
      name: "mail",
      mock: mockMailInfinite,
      render: () => useCharacterMails(CHARACTER_ID),
      url: "/characters/:character_id/mail",
    },
  ];

  it.each(cases)("$name", ({ mock, render, url }) => {
    mock.mockClear();

    renderHook(render);

    const queryKey = queryKeyFrom(mock);
    // Built from the endpoint's own key, so two subjects and two endpoints
    // stay distinct...
    expect(queryKey[0]).toMatchObject({
      url,
      params: { character_id: CHARACTER_ID },
    });
    // ...and marked, so InfiniteData cannot land on the single-page entry.
    expect(queryKey.at(-1)).toBe(INFINITE_QUERY_KEY_MARKER);
  });

  it("keeps mail's label dimension inside the marked key", () => {
    mockMailInfinite.mockClear();

    renderHook(() => useCharacterMails(CHARACTER_ID, [3, 4]));

    const queryKey = queryKeyFrom(mockMailInfinite);
    // The labels ride along, so two label selections do not share an entry.
    expect(queryKey).toContainEqual({ labels: "3,4" });
    expect(queryKey.at(-1)).toBe(INFINITE_QUERY_KEY_MARKER);
  });
});
