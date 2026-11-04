import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";

import type * as ContractListModule from "~/app/contracts/ContractList";
import type { PublicContractsPage } from "~/app/contracts/data";
import type * as PublicContractsModule from "~/app/contracts/PublicContracts";
import type { ContractSummary } from "~/components/Contracts/contract";
import type * as ContractTableModule from "~/components/Contracts/ContractTable";
import type { ContractFilters } from "~/components/Contracts/filters";

// The public half of /contracts: the page it fetches from /api/contracts, and
// the three ways a page of contracts is laid out (rows, cards, table).

jest.mock("@jitaspace/eve-icons", () => {
  return new Proxy({}, { get: () => () => null });
});
jest.mock("@jitaspace/ui", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  const parts: Record<string, unknown> = {
    ISKAmount: ({ amount }: { amount: number }) =>
      React.createElement("span", null, `${amount} ISK`),
  };
  return new Proxy(parts, {
    get: (target, key: string) => target[key] ?? passThrough,
  });
});
jest.mock("@jitaspace/eve-components", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
});

const { PublicContracts } =
  require("~/app/contracts/PublicContracts") as typeof PublicContractsModule;
const { ContractList, ContractListSkeleton } =
  require("~/app/contracts/ContractList") as typeof ContractListModule;
const { ContractTable } =
  require("~/components/Contracts/ContractTable") as typeof ContractTableModule;

const FILTERS: ContractFilters = {
  type: "all",
  regionId: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  page: 1,
};

function contract(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    contractId: 1,
    type: "item_exchange",
    title: "Contract 1",
    issuerId: 90000001,
    issuerName: "Issuer",
    issuerCorporationId: 98000001,
    issuerCorporationName: "Corp",
    forCorporation: false,
    dateIssued: "2026-11-01T00:00:00.000Z",
    dateExpired: "2099-11-30T00:00:00.000Z",
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

function page(
  overrides: Partial<PublicContractsPage> = {},
): PublicContractsPage {
  return {
    contracts: [contract()],
    total: 1,
    page: 1,
    pageSize: 48,
    ...overrides,
  };
}

/** The contracts listed, by the title each shows, in order. */
const listedTitles = () =>
  screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/contracts/"))
    .map((link) => link.textContent);

const mockFetch = jest.fn<typeof fetch>();
const respondWith = (body: PublicContractsPage | null, status = 200) => {
  mockFetch.mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
};

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
  window.scrollTo = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderPublic(
  filters: Partial<ContractFilters> = {},
  onPageChange: (page: number) => void = jest.fn(),
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <PublicContracts
          filters={{ ...FILTERS, ...filters }}
          view="rows"
          onPageChange={onPageChange}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("PublicContracts", () => {
  it("shows a skeleton, then the page, with the total", async () => {
    respondWith(
      page({
        contracts: [
          contract({ contractId: 1, title: "First" }),
          contract({ contractId: 2, title: "Second" }),
        ],
        total: 1234,
      }),
    );
    const { container } = renderPublic();
    expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();

    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(listedTitles()).toEqual(["First", "Second"]);
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
  });

  it("asks the API for the filters, leaving defaults out", async () => {
    respondWith(page());
    renderPublic({ type: "courier", regionId: 10000002, page: 3 });
    await screen.findByText("Contract 1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contracts?type=courier&region=10000002&page=3",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("asks for the bare endpoint without filters", async () => {
    respondWith(page());
    renderPublic();
    await screen.findByText("Contract 1");
    expect(mockFetch.mock.calls[0]?.[0]).toBe("/api/contracts");
  });

  it("says so when the request fails", async () => {
    respondWith(null, 500);
    renderPublic();
    expect(
      await screen.findByText(/Public contracts could not be loaded/),
    ).toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    respondWith(page({ contracts: [], total: 0 }));
    renderPublic();
    expect(
      await screen.findByText("No public contracts match these filters."),
    ).toBeInTheDocument();
  });

  it("offers the first page for a link past the last", async () => {
    respondWith(page({ contracts: [], total: 10 }));
    const onPageChange = jest.fn();
    renderPublic({ page: 9 }, onPageChange);
    expect(
      await screen.findByText(
        "Page 9 is past the last page of these contracts.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Go to the first page" }),
    );
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("paginates only when there is more than one page", async () => {
    respondWith(page({ total: 48 }));
    const { unmount } = renderPublic();
    await screen.findByText("Contract 1");
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
    unmount();

    respondWith(page({ total: 100 }));
    const onPageChange = jest.fn();
    renderPublic({}, onPageChange);
    await screen.findByText("Contract 1");
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(window.scrollTo).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
  });
});

describe("ContractList", () => {
  const contracts = [
    contract({ contractId: 1, title: "First" }),
    contract({ contractId: 2, title: "Second" }),
  ];

  it.each(["rows", "cards", "table"] as const)(
    "lists every contract as %s",
    (view) => {
      render(
        <MantineProvider>
          <ContractList contracts={contracts} view={view} />
        </MantineProvider>,
      );
      expect(listedTitles()).toEqual(["First", "Second"]);
      expect(screen.queryAllByRole("table").length).toBe(
        view === "table" ? 1 : 0,
      );
    },
  );

  it.each(["rows", "cards", "table"] as const)(
    "draws placeholders shaped like %s",
    (view) => {
      const { container } = render(
        <MantineProvider>
          <ContractListSkeleton view={view} count={20} />
        </MantineProvider>,
      );
      expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();
      expect(listedTitles()).toEqual([]);
    },
  );

  it("caps the card placeholders at twelve", () => {
    const { container: cards } = render(
      <MantineProvider>
        <ContractListSkeleton view="cards" count={48} />
      </MantineProvider>,
    );
    const { container: three } = render(
      <MantineProvider>
        <ContractListSkeleton view="cards" count={3} />
      </MantineProvider>,
    );
    const perCard = three.querySelectorAll(".mantine-Skeleton-root").length / 3;
    expect(cards.querySelectorAll(".mantine-Skeleton-root")).toHaveLength(
      perCard * 12,
    );
  });
});

describe("ContractTable", () => {
  const structure = {
    locationId: 1_035_466_617_946,
    kind: "structure" as const,
    solarSystemId: null,
  };

  it("shows each contract's amounts and expiry", () => {
    render(
      <MantineProvider>
        <ContractTable
          contracts={[
            contract({
              contractId: 1,
              type: "courier",
              title: "Haul",
              price: null,
              reward: 7_000_000,
              collateral: 300_000_000,
            }),
            contract({
              contractId: 2,
              title: "Sale",
              status: "in_progress",
            }),
          ]}
        />
      </MantineProvider>,
    );
    expect(listedTitles()).toEqual(["Haul", "Sale"]);
    expect(screen.getByText("7000000 ISK")).toBeInTheDocument();
    expect(screen.getByText("300000000 ISK")).toBeInTheDocument();
    expect(screen.getByText("1000000 ISK")).toBeInTheDocument();
    // A contract no longer outstanding shows its status, not its expiry.
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByText(/^Expires /)).toHaveLength(1);
    expect(screen.getAllByText("Courier").length).toBeGreaterThan(0);
  });

  it("names a structure only for the visitor's own contracts", () => {
    const row = contract({ start: structure });
    const { unmount } = render(
      <MantineProvider>
        <ContractTable contracts={[row]} />
      </MantineProvider>,
    );
    expect(screen.getByText(/Player structure/)).toBeInTheDocument();
    unmount();

    render(
      <MantineProvider>
        <ContractTable contracts={[row]} resolveStructures />
      </MantineProvider>,
    );
    expect(screen.queryByText(/Player structure/)).not.toBeInTheDocument();
  });

  it("draws skeleton rows while loading", () => {
    const { container } = render(
      <MantineProvider>
        <ContractTable contracts={[]} isLoading />
      </MantineProvider>,
    );
    expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();
  });
});
