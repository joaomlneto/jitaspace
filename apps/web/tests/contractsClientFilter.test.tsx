import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type * as HookModule from "~/app/contracts/useOpenContracts";
import type { ContractSummary } from "~/components/Contracts/contract";
import type { ContractFilters } from "~/components/Contracts/filters";
import type {
  OpenContract,
  OpenContractsShard,
} from "~/components/Contracts/snapshot";
import {
  compareContracts,
  filterOpenContracts,
  matchesContractFilters,
  regionFacets,
} from "~/components/Contracts/clientFilter";
import { OPEN_CONTRACT_SHARDS } from "~/components/Contracts/snapshot";

// The contracts browser's filters and sorts, run in the browser, and the hook
// that loads the open contracts they run over.

const { useOpenContracts } =
  require("~/app/contracts/useOpenContracts") as typeof HookModule;

const FILTERS: Omit<ContractFilters, "page"> = {
  type: "all",
  regionId: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
};

function contract(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    contractId: 1,
    type: "item_exchange",
    title: "",
    issuerId: 90000001,
    issuerCorporationId: 98000001,
    forCorporation: false,
    dateIssued: "2026-11-01T00:00:00.000Z",
    dateExpired: "2026-11-30T00:00:00.000Z",
    daysToComplete: null,
    volume: null,
    price: 1_000_000,
    reward: null,
    collateral: null,
    buyout: null,
    start: null,
    end: null,
    regionId: 10000002,
    regionName: "The Forge",
    ...overrides,
  };
}

const open = (
  overrides: Partial<ContractSummary> = {},
  search = (overrides.title ?? "").toLowerCase(),
): OpenContract => ({ contract: contract(overrides), search, typeIds: [] });

describe("matchesContractFilters", () => {
  it("matches the type, the region and the search text", () => {
    const rifter = contract({ title: "Cheap Rifter" });
    expect(matchesContractFilters(rifter, FILTERS)).toBe(true);
    expect(
      matchesContractFilters(rifter, { ...FILTERS, type: "courier" }),
    ).toBe(false);
    expect(
      matchesContractFilters(rifter, { ...FILTERS, regionId: 10000043 }),
    ).toBe(false);
    expect(matchesContractFilters(rifter, { ...FILTERS, q: "RIFTER" })).toBe(
      true,
    );
    // An item's name counts when the search text holds it.
    expect(
      matchesContractFilters(
        contract({ title: "" }),
        { ...FILTERS, q: "gila" },
        "\ngila blueprint",
      ),
    ).toBe(true);
  });

  it("bounds the amount the row shows", () => {
    const wtb = contract({ price: null, reward: 5_000_000 });
    expect(matchesContractFilters(wtb, { ...FILTERS, minPrice: 1 })).toBe(true);
    expect(
      matchesContractFilters(wtb, { ...FILTERS, maxPrice: 1_000_000 }),
    ).toBe(false);
    // An auction is listed at its current bid.
    expect(
      matchesContractFilters(
        contract({ type: "auction", price: 100, highestBid: 9_000 }),
        { ...FILTERS, minPrice: 5_000 },
      ),
    ).toBe(true);
    expect(
      matchesContractFilters(contract({ price: null }), {
        ...FILTERS,
        minPrice: 0,
      }),
    ).toBe(false);
  });
});

describe("compareContracts and filterOpenContracts", () => {
  const contracts = [
    open({
      contractId: 1,
      title: "a",
      dateIssued: "2026-11-02T00:00:00.000Z",
      dateExpired: "2026-11-20T00:00:00.000Z",
      price: 30,
    }),
    open({
      contractId: 2,
      title: "b",
      dateIssued: "2026-11-03T00:00:00.000Z",
      dateExpired: "2026-11-10T00:00:00.000Z",
      price: null,
    }),
    open({
      contractId: 3,
      title: "c",
      dateIssued: "2026-11-01T00:00:00.000Z",
      dateExpired: "2026-11-15T00:00:00.000Z",
      price: 10,
    }),
  ];
  const ids = (sort: ContractFilters["sort"]) =>
    filterOpenContracts(contracts, { ...FILTERS, sort }).map(
      (c) => c.contractId,
    );

  it.each([
    ["newest", [2, 1, 3]],
    ["oldest", [3, 1, 2]],
    ["expiring", [2, 3, 1]],
    // Contracts without an amount go last whichever way price sorts.
    ["price-desc", [1, 3, 2]],
    ["price-asc", [3, 1, 2]],
  ] as const)("sorts %s", (sort, expected) => {
    expect(ids(sort)).toEqual(expected);
  });

  it("drops what the filters do not match", () => {
    expect(
      filterOpenContracts(contracts, { ...FILTERS, q: "b" }).map(
        (c) => c.contractId,
      ),
    ).toEqual([2]);
  });

  it("orders equal dates as equal", () => {
    const a = contract();
    expect(compareContracts(a, contract(), "newest")).toBe(0);
  });
});

describe("regionFacets", () => {
  const contracts = [
    open({ regionId: 10000002, regionName: "The Forge", type: "auction" }),
    open({ regionId: 10000002, regionName: "The Forge" }),
    open({ regionId: 10000043, regionName: "Domain" }),
    open({ regionId: 10000032, regionName: null }),
    open({ regionId: null }),
  ];

  it("counts each region's contracts, busiest first", () => {
    expect(regionFacets(contracts, FILTERS)).toEqual([
      { regionId: 10000002, name: "The Forge", count: 2 },
      { regionId: 10000043, name: "Domain", count: 1 },
      { regionId: 10000032, name: "Region 10000032", count: 1 },
    ]);
  });

  it("counts under the other filters, never the region's own", () => {
    expect(
      regionFacets(contracts, {
        ...FILTERS,
        type: "auction",
        regionId: 10000043,
      }),
    ).toEqual([{ regionId: 10000002, name: "The Forge", count: 1 }]);
  });
});

describe("useOpenContracts", () => {
  const mockFetch = jest.fn<typeof fetch>();
  const shardBody = (shard: number): OpenContractsShard => ({
    shard,
    snapshotAt: `2026-11-08T1${shard}:00:00.000Z`,
    isBackfilling: shard === 3,
    contracts: [
      [
        shard + 100,
        0,
        `Shard ${shard}`,
        1,
        2,
        0,
        1793491200,
        1794700800,
        null,
        null,
        10,
        null,
        null,
        null,
        10000002,
        null,
        null,
        null,
        null,
        0,
        [],
      ],
    ],
    characters: {},
    corporations: {},
    regions: {},
    types: {},
    systems: {},
    stations: {},
  });
  // jsdom has no fetch Response; the hook reads only these three members.
  const respond = (body: unknown, status = 200) =>
    Promise.resolve({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
    } as Response);

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const render = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return renderHook(() => useOpenContracts(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
  };

  it("joins every shard once all have loaded", async () => {
    mockFetch.mockImplementation((url) =>
      respond(shardBody(Number((url as string).split("/").at(-1)))),
    );
    const { result } = render();
    expect(result.current).toMatchObject({
      contracts: [],
      isPending: true,
      isError: false,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(OPEN_CONTRACT_SHARDS);
    expect(
      result.current.contracts.map(({ contract: c }) => c.contractId),
    ).toEqual(
      Array.from({ length: OPEN_CONTRACT_SHARDS }, (_, shard) => shard + 100),
    );
    expect(result.current.loaded).toBe(OPEN_CONTRACT_SHARDS);
    // The newest listing of any shard, and backfilling if any shard is.
    expect(result.current.snapshotAt).toBe(
      `2026-11-08T1${OPEN_CONTRACT_SHARDS - 1}:00:00.000Z`,
    );
    expect(result.current.isBackfilling).toBe(true);
  });

  it("shows nothing, and an error, when a shard fails", async () => {
    mockFetch.mockImplementation((url) =>
      (url as string).endsWith("/2")
        ? respond({ error: "x" }, 500)
        : respond(shardBody(0)),
    );
    const { result } = render();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.contracts).toEqual([]);
  });
});
