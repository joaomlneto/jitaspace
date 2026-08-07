import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// The character-scoped infinite hooks, exercised the way
// corporationAllianceInfiniteHooks.test.tsx exercises their siblings: the
// generated infinite hook is mocked, its `queryFn` and `getNextPageParam` are
// invoked as react-query would, and the derived shape each hook returns is
// asserted.
//
// These four had no behavioural test at all, which is how a misplaced query-key
// override survived in the contacts hooks — the existing suites mocked the
// infinite hooks without ever inspecting what was handed to them.
//
// @swc/jest does not hoist jest.mock above imports, so the generated client is
// mocked here and the hooks are required lazily below.
const mockUseAccessToken = jest.fn();
const mockGetAssets = jest.fn();
const mockGetContacts = jest.fn();
const mockGetMail = jest.fn();
const mockAssetsInfinite = jest.fn();
const mockContactsInfinite = jest.fn();
const mockContactsLabels = jest.fn();
const mockCalendarInfinite = jest.fn();
const mockMailInfinite = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getCharactersCharacterIdAssets: (...a: unknown[]) => mockGetAssets(...a),
  getCharactersCharacterIdContacts: (...a: unknown[]) => mockGetContacts(...a),
  getCharactersCharacterIdMail: (...a: unknown[]) => mockGetMail(...a),
  getCharactersCharacterIdAssetsInfiniteQueryKey: (id: unknown) => [
    "assets",
    id,
  ],
  getCharactersCharacterIdContactsInfiniteQueryKey: (id: unknown) => [
    "contacts",
    id,
  ],
  getCharactersCharacterIdCalendarInfiniteQueryKey: (id: unknown) => [
    "calendar",
    id,
  ],
  getCharactersCharacterIdMailInfiniteQueryKey: (id: unknown) => ["mail", id],
  useGetCharactersCharacterIdAssetsInfinite: (...a: unknown[]) =>
    mockAssetsInfinite(...a),
  useGetCharactersCharacterIdContactsInfinite: (...a: unknown[]) =>
    mockContactsInfinite(...a),
  useGetCharactersCharacterIdContactsLabels: (...a: unknown[]) =>
    mockContactsLabels(...a),
  useGetCharactersCharacterIdCalendarInfinite: (...a: unknown[]) =>
    mockCalendarInfinite(...a),
  useGetCharactersCharacterIdMailInfinite: (...a: unknown[]) =>
    mockMailInfinite(...a),
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

const CHARACTER_ID = 90000001;
const AUTH = { Authorization: "Bearer token" };

interface Page {
  data: unknown[];
  headers?: Record<string, string>;
}
interface InfiniteOptions {
  query?: {
    queryFn?: (context: { pageParam: unknown }) => unknown;
    getNextPageParam?: (last: Page, pages: Page[]) => unknown;
    initialPageParam?: unknown;
  };
}

function infiniteResult(pages: Page[], hasNextPage: boolean) {
  return {
    data: { pages },
    isLoading: false,
    error: null,
    hasNextPage,
    fetchNextPage: jest.fn(() => Promise.resolve()),
    refetch: jest.fn(),
  };
}

/**
 * Stand in for a generated infinite hook: run the `queryFn` for the first page
 * the way react-query would, capture the options for `getNextPageParam`
 * assertions, then return the canned result.
 */
function driveInfinite(
  mock: jest.Mock,
  result: ReturnType<typeof infiniteResult>,
) {
  let captured: InfiniteOptions | undefined;
  mock.mockImplementation((...args: unknown[]) => {
    captured = args.at(-1) as InfiniteOptions;
    void captured.query?.queryFn?.({
      pageParam: captured.query.initialPageParam,
    });
    return result;
  });
  return {
    result,
    nextPageParam: (last: Page, pages: Page[]) =>
      captured?.query?.getNextPageParam?.(last, pages),
  };
}

/** ESI reports total pages in a header; 50 rows means "there may be more". */
const page = (data: unknown[], xPages?: string): Page => ({
  data,
  headers: xPages == undefined ? {} : { "x-pages": xPages },
});
const fiftyMails = Array.from({ length: 50 }, (_, i) => ({ mail_id: 500 - i }));
const fiftyEvents = Array.from({ length: 50 }, (_, i) => ({
  event_id: 900 - i,
}));

beforeEach(() => {
  mockUseAccessToken
    .mockReset()
    .mockReturnValue({ accessToken: "token", authHeaders: AUTH });
  mockContactsLabels.mockReset().mockReturnValue({ data: undefined });
});

describe("useCharacterAssets", () => {
  it("indexes assets by item_id, groups them by location, and eagerly pages", () => {
    const { result: query, nextPageParam } = driveInfinite(
      mockAssetsInfinite,
      infiniteResult(
        [
          page([
            { item_id: 1, location_id: 60, location_type: "station" },
            { item_id: 2, location_id: 60, location_type: "station" },
          ]),
        ],
        true,
      ),
    );

    const { result } = renderHook(() => useCharacterAssets(CHARACTER_ID));

    // Page 1 is requested through the ESI fetcher, and the eager effect asks
    // for the next one because the whole inventory is expected.
    expect(mockGetAssets).toHaveBeenCalledWith(CHARACTER_ID, { page: 1 }, AUTH);
    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);

    expect(result.current.assets[1]).toMatchObject({ item_id: 1 });
    expect(result.current.locations[60]?.items).toEqual([1, 2]);
    expect(result.current.hasToken).toBe(true);

    // x-pages drives paging: page 2 of 3 exists, page 3 of 3 is the end.
    expect(nextPageParam(page([], "3"), [page([])])).toBe(2);
    expect(
      nextPageParam(page([], "3"), [page([]), page([]), page([])]),
    ).toBeUndefined();
    // A missing header means one page.
    expect(nextPageParam(page([]), [page([])])).toBeUndefined();
  });

  it("reports no token when the character has not granted the scope", () => {
    mockUseAccessToken.mockReturnValue({ accessToken: null, authHeaders: {} });
    driveInfinite(mockAssetsInfinite, infiniteResult([], false));

    const { result } = renderHook(() => useCharacterAssets(CHARACTER_ID));

    expect(result.current.hasToken).toBe(false);
    expect(result.current.assets).toEqual({});
  });

  it("returns empty collections before any page has loaded", () => {
    mockAssetsInfinite.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useCharacterAssets(CHARACTER_ID));

    expect(result.current.assets).toEqual({});
    expect(result.current.locations).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });
});

describe("the optional characterId", () => {
  // assets, calendar and mail take `characterId?: number`, and each falls back
  // to 0 while disabling the query. Rendering with none exercises that path.
  it.each([
    {
      name: "assets",
      mock: mockAssetsInfinite,
      render: () => useCharacterAssets(),
    },
    {
      name: "calendar",
      mock: mockCalendarInfinite,
      render: () => useCharacterCalendar(),
    },
    { name: "mail", mock: mockMailInfinite, render: () => useCharacterMails() },
  ] as { name: string; mock: jest.Mock; render: () => unknown }[])(
    "$name disables the query and asks for character 0",
    ({ mock, render }) => {
      driveInfinite(mock, infiniteResult([], false));

      renderHook(render);

      const options = mock.mock.calls[0]?.at(-1) as {
        query?: { enabled?: boolean };
      };
      expect(options.query?.enabled).toBe(false);
      expect(mock.mock.calls[0]?.[0]).toBe(0);
    },
  );
});

describe("useCharacterContacts", () => {
  it("flattens every page, resolves labels, and eagerly pages", () => {
    const { result: query, nextPageParam } = driveInfinite(
      mockContactsInfinite,
      infiniteResult(
        [page([{ contact_id: 100 }]), page([{ contact_id: 200 }])],
        true,
      ),
    );
    mockContactsLabels.mockReturnValue({
      data: { data: [{ label_id: 1, label_name: "Blue" }] },
    });

    const { result } = renderHook(() => useCharacterContacts(CHARACTER_ID));

    expect(mockGetContacts).toHaveBeenCalledWith(
      CHARACTER_ID,
      { page: 1 },
      AUTH,
    );
    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([
      { contact_id: 100 },
      { contact_id: 200 },
    ]);
    expect(result.current.labels).toEqual([
      { label_id: 1, label_name: "Blue" },
    ]);

    expect(nextPageParam(page([], "2"), [page([])])).toBe(2);
    expect(nextPageParam(page([], "1"), [page([])])).toBeUndefined();
    // No x-pages header at all reads as zero pages, so paging stops.
    expect(nextPageParam(page([]), [page([])])).toBeUndefined();
  });

  it("returns empty results before any page has loaded", () => {
    mockContactsInfinite.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useCharacterContacts(CHARACTER_ID));

    expect(result.current.data).toEqual([]);
    expect(result.current.labels).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useCharacterCalendar", () => {
  it("flattens events and pages backwards from the oldest event id", () => {
    const { result: query, nextPageParam } = driveInfinite(
      mockCalendarInfinite,
      infiniteResult([page([{ event_id: 900 }, { event_id: 901 }])], true),
    );

    const { result } = renderHook(() => useCharacterCalendar(CHARACTER_ID));

    expect(result.current.events).toEqual([
      { event_id: 900 },
      { event_id: 901 },
    ]);
    expect(result.current.hasMoreEvents).toBe(true);
    expect(result.current.loadMoreEvents).toBe(query.fetchNextPage);

    // A full page of 50 means there may be more, and the cursor is the oldest
    // event id on it. Anything short of 50 is the last page.
    expect(nextPageParam(page(fiftyEvents), [])).toBe(851);
    expect(nextPageParam(page([{ event_id: 900 }]), [])).toBeUndefined();
    // A row without an id is skipped rather than poisoning the cursor with
    // NaN: the oldest id still present wins.
    expect(nextPageParam(page([{}, ...fiftyEvents.slice(1)]), [])).toBe(851);
  });
});

describe("useCharacterMails", () => {
  it("flattens messages, passes the label filter, and pages by last mail id", () => {
    const { result: query, nextPageParam } = driveInfinite(
      mockMailInfinite,
      infiniteResult([page([{ mail_id: 10 }, { mail_id: 11 }])], true),
    );

    const { result } = renderHook(() =>
      useCharacterMails(CHARACTER_ID, [3, 4]),
    );

    // The first page has no cursor; the label filter goes out as ESI expects,
    // comma-joined rather than repeated.
    expect(mockGetMail).toHaveBeenCalledWith(
      CHARACTER_ID,
      { last_mail_id: undefined, labels: "3,4" },
      AUTH,
    );
    expect(result.current.messages).toEqual([{ mail_id: 10 }, { mail_id: 11 }]);
    expect(result.current.hasMoreMessages).toBe(true);
    expect(result.current.loadMoreMessages).toBe(query.fetchNextPage);

    expect(nextPageParam(page(fiftyMails), [])).toBe(451);
    expect(nextPageParam(page([{ mail_id: 10 }]), [])).toBeUndefined();
    // A row without an id is skipped rather than poisoning the cursor with
    // NaN: the oldest id still present wins.
    expect(nextPageParam(page([{}, ...fiftyMails.slice(1)]), [])).toBe(451);
  });

  it("sends no label filter when none are selected", () => {
    driveInfinite(mockMailInfinite, infiniteResult([], false));

    renderHook(() => useCharacterMails(CHARACTER_ID));

    expect(mockGetMail).toHaveBeenCalledWith(
      CHARACTER_ID,
      { last_mail_id: undefined, labels: "" },
      AUTH,
    );
  });
});
