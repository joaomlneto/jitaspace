import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// The corporation/alliance asset and contact hooks wrap generated infinite
// queries and eagerly page through them. @swc/jest does not hoist jest.mock
// above imports, so the generated @jitaspace/esi-client and the auth store are
// mocked here and the hooks under test are required lazily below.

const mockUseAccessToken = jest.fn();
const mockGetCorporationContacts = jest.fn<
  (...args: unknown[]) => Promise<{ data: unknown[]; headers: unknown }>
>(() => Promise.resolve({ data: [], headers: {} }));
const mockGetAllianceContacts = jest.fn<
  (...args: unknown[]) => Promise<{ data: unknown[]; headers: unknown }>
>(() => Promise.resolve({ data: [], headers: {} }));
const mockUseCorporationAssetsInfinite = jest.fn();
const mockUseCorporationContactsInfinite = jest.fn();
const mockUseCorporationContactsLabels = jest.fn();
const mockUseAllianceContactsInfinite = jest.fn();
const mockUseAllianceContactsLabels = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getCorporationsCorporationIdAssets: jest.fn(),
  useGetCorporationsCorporationIdAssetsInfinite: (...args: unknown[]) =>
    mockUseCorporationAssetsInfinite(...args),
  getCorporationsCorporationIdContacts: (...args: unknown[]) =>
    mockGetCorporationContacts(...args),
  useGetCorporationsCorporationIdContactsInfinite: (...args: unknown[]) =>
    mockUseCorporationContactsInfinite(...args),
  useGetCorporationsCorporationIdContactsLabels: (...args: unknown[]) =>
    mockUseCorporationContactsLabels(...args),
  getAlliancesAllianceIdContacts: (...args: unknown[]) =>
    mockGetAllianceContacts(...args),
  useGetAlliancesAllianceIdContactsInfinite: (...args: unknown[]) =>
    mockUseAllianceContactsInfinite(...args),
  useGetAlliancesAllianceIdContactsLabels: (...args: unknown[]) =>
    mockUseAllianceContactsLabels(...args),
}));

jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

const { useCorporationAssets } =
  require("../src/hooks/assets/useCorporationAssets") as typeof import("../src/hooks/assets/useCorporationAssets");
const { useCorporationContacts } =
  require("../src/hooks/contacts/useCorporationContacts") as typeof import("../src/hooks/contacts/useCorporationContacts");
const { useAllianceContacts } =
  require("../src/hooks/contacts/useAllianceContacts") as typeof import("../src/hooks/contacts/useAllianceContacts");

interface InfiniteQueryOptions {
  query?: { queryFn?: (context: { pageParam: number }) => unknown };
}

function infiniteResult(
  pages: { data: unknown[] }[],
  { hasNextPage }: { hasNextPage: boolean },
) {
  return {
    data: { pages },
    isLoading: false,
    error: null,
    hasNextPage,
    fetchNextPage: jest.fn(() => Promise.resolve()),
    refetch: jest.fn(),
  };
}

// Stand in for a generated infinite hook: invoke the `queryFn` once (as
// react-query would when loading the first page) so the hook's page fetcher is
// exercised, then return the canned result.
function mockInfiniteHook<T>(mock: jest.Mock, result: T): T {
  mock.mockImplementation((...args: unknown[]) => {
    const options = args[3] as InfiniteQueryOptions | undefined;
    void options?.query?.queryFn?.({ pageParam: 1 });
    return result;
  });
  return result;
}

describe("corporation & alliance infinite-pagination hooks", () => {
  beforeEach(() => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: { Authorization: "Bearer token" },
    });
  });

  it("useCorporationAssets indexes assets by item_id and eagerly loads all pages", () => {
    const query = infiniteResult(
      [{ data: [{ item_id: 1, location_id: 60, location_type: "station" }] }],
      { hasNextPage: true },
    );
    mockUseCorporationAssetsInfinite.mockReturnValue(query);

    const { result } = renderHook(() => useCorporationAssets(98000001));

    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(result.current.assets[1]).toEqual({
      item_id: 1,
      location_id: 60,
      location_type: "station",
    });
    expect(result.current.locations[60]?.items).toEqual([1]);
  });

  it("useCorporationContacts flattens every contacts page, eagerly loads them, and pages via the ESI fetcher", () => {
    const query = mockInfiniteHook(
      mockUseCorporationContactsInfinite,
      infiniteResult(
        [{ data: [{ contact_id: 100 }] }, { data: [{ contact_id: 200 }] }],
        { hasNextPage: true },
      ),
    );
    mockUseCorporationContactsLabels.mockReturnValue({
      data: { data: [{ label_id: 1, label_name: "Blue" }] },
    });

    const { result } = renderHook(() => useCorporationContacts(98000001));

    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockGetCorporationContacts).toHaveBeenCalledWith(
      98000001,
      { page: 1 },
      { Authorization: "Bearer token" },
    );
    expect(result.current.data).toEqual([
      { contact_id: 100 },
      { contact_id: 200 },
    ]);
    expect(result.current.labels).toEqual([
      { label_id: 1, label_name: "Blue" },
    ]);
  });

  it("useCorporationContacts returns empty results before any page has loaded", () => {
    mockUseCorporationContactsInfinite.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(() => Promise.resolve()),
      refetch: jest.fn(),
    });
    mockUseCorporationContactsLabels.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useCorporationContacts(98000001));

    expect(result.current.data).toEqual([]);
    expect(result.current.labels).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("useAllianceContacts flattens contacts, pages via the ESI fetcher, and stops on the last page", () => {
    const query = mockInfiniteHook(
      mockUseAllianceContactsInfinite,
      infiniteResult([{ data: [{ contact_id: 300 }] }], { hasNextPage: false }),
    );
    mockUseAllianceContactsLabels.mockReturnValue({ data: { data: [] } });

    const { result } = renderHook(() => useAllianceContacts(99000001));

    expect(query.fetchNextPage).not.toHaveBeenCalled();
    expect(mockGetAllianceContacts).toHaveBeenCalledWith(
      99000001,
      { page: 1 },
      { Authorization: "Bearer token" },
    );
    expect(result.current.data).toEqual([{ contact_id: 300 }]);
    expect(result.current.labels).toEqual([]);
  });
});
