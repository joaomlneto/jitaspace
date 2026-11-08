import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import type * as ContractListModule from "~/app/contracts/ContractList";
import type * as PublicContractsModule from "~/app/contracts/PublicContracts";
import type { OpenContracts } from "~/app/contracts/useOpenContracts";
import type { ContractSummary } from "~/components/Contracts/contract";
import type * as ContractTableModule from "~/components/Contracts/ContractTable";
import type { ContractFilters } from "~/components/Contracts/filters";
import type { OpenContract } from "~/components/Contracts/snapshot";

// The public half of /contracts: every open contract is in the browser
// (useOpenContracts), filtered, sorted and paged in memory; and the three ways
// a page of contracts is laid out (rows, cards, table).

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

/** An open contract as useOpenContracts hands it over. */
function record(
  overrides: Partial<ContractSummary> = {},
  items: string[] = [],
): OpenContract {
  const summary = contract(overrides);
  return {
    contract: summary,
    search: [summary.title, ...items].join("\n").toLowerCase(),
    typeIds: [],
  };
}

function loaded(contracts: OpenContract[]): OpenContracts {
  return {
    contracts,
    isPending: false,
    isError: false,
    snapshotAt: "2026-11-08T20:00:00.000Z",
    isBackfilling: false,
  };
}

const PENDING: OpenContracts = {
  contracts: [],
  isPending: true,
  isError: false,
  snapshotAt: null,
  isBackfilling: false,
};

/** The contracts listed, by the title each shows, in order. */
const listedTitles = () =>
  screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/contracts/"))
    .map((link) => link.textContent);

/** `count` contracts, the newest first, titled by number. */
const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    record({
      contractId: index + 1,
      title: `Contract ${index + 1}`,
      dateIssued: new Date(
        Date.UTC(2026, 10, 1) - index * 60_000,
      ).toISOString(),
    }),
  );

beforeEach(() => {
  window.scrollTo = jest.fn();
});

function renderPublic(
  open: OpenContracts,
  filters: Partial<ContractFilters> = {},
  onPageChange: (page: number) => void = jest.fn(),
) {
  return render(
    <MantineProvider>
      <PublicContracts
        open={open}
        filters={{ ...FILTERS, ...filters }}
        view="rows"
        onPageChange={onPageChange}
      />
    </MantineProvider>,
  );
}

describe("PublicContracts", () => {
  it("shows a skeleton while the contracts load", () => {
    const { container } = renderPublic(PENDING);
    expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();
    expect(listedTitles()).toEqual([]);
    // No count until they are in.
    expect(screen.queryByText("0")).toBeNull();
  });

  it("says so when a shard fails", () => {
    renderPublic({ ...PENDING, isPending: false, isError: true });
    expect(
      screen.getByText(/Public contracts could not be loaded/),
    ).toBeInTheDocument();
  });

  it("lists every contract, newest first, with the total", () => {
    renderPublic(
      loaded([
        record({
          contractId: 1,
          title: "Older",
          dateIssued: "2026-11-01T00:00:00.000Z",
        }),
        record({
          contractId: 2,
          title: "Newer",
          dateIssued: "2026-11-02T00:00:00.000Z",
        }),
      ]),
    );
    expect(listedTitles()).toEqual(["Newer", "Older"]);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("searches item names as well as titles, and counts the matches", () => {
    renderPublic(
      loaded([
        record({ contractId: 1, title: "Ships" }, ["Rifter", "Tritanium"]),
        record({ contractId: 2, title: "Rifter fits" }),
        record({ contractId: 3, title: "Ore" }, ["Veldspar"]),
      ]),
      { q: "RIFTER" },
    );
    expect(listedTitles().sort()).toEqual(["Rifter fits", "Ships"]);
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("narrows by type, region and the price the row shows", () => {
    const open = loaded([
      record({ contractId: 1, title: "Cheap", price: 1_000 }),
      record({ contractId: 2, title: "Dear", price: 9_000_000 }),
      record({
        contractId: 3,
        title: "Want to buy",
        price: null,
        reward: 5_000,
      }),
      record({
        contractId: 4,
        title: "Haul",
        type: "courier",
        price: null,
        reward: 3_000,
      }),
      record({
        contractId: 5,
        title: "Elsewhere",
        regionId: 10000043,
        price: 2_000,
      }),
    ]);
    const { unmount } = renderPublic(open, { type: "courier" });
    expect(listedTitles()).toEqual(["Haul"]);
    unmount();

    const region = renderPublic(open, { regionId: 10000043 });
    expect(listedTitles()).toEqual(["Elsewhere"]);
    region.unmount();

    // A "want to buy" exchange is listed at its reward.
    renderPublic(open, { minPrice: 2_500, maxPrice: 10_000 });
    expect(listedTitles().sort()).toEqual(["Haul", "Want to buy"]);
  });

  it("sorts by the amount the row shows, unpriced last", () => {
    renderPublic(
      loaded([
        record({ contractId: 1, title: "Mid", price: 500 }),
        record({ contractId: 2, title: "None", price: null }),
        record({ contractId: 3, title: "Top", price: 900 }),
        record({ contractId: 4, title: "Low", price: 100 }),
      ]),
      { sort: "price-desc" },
    );
    expect(listedTitles()).toEqual(["Top", "Mid", "Low", "None"]);
  });

  it("says so when nothing matches", () => {
    renderPublic(loaded([record()]), { q: "nothing like it" });
    expect(
      screen.getByText("No public contracts match these filters."),
    ).toBeInTheDocument();
  });

  it("shows 48 contracts a page, and pages in memory", () => {
    const onPageChange = jest.fn();
    const { unmount } = renderPublic(loaded(many(100)), {}, onPageChange);
    expect(listedTitles()).toHaveLength(48);
    expect(listedTitles()[0]).toBe("Contract 1");
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(window.scrollTo).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
    unmount();

    renderPublic(loaded(many(100)), { page: 3 });
    expect(listedTitles()).toEqual([
      "Contract 97",
      "Contract 98",
      "Contract 99",
      "Contract 100",
    ]);
  });

  it("does not paginate a single page", () => {
    renderPublic(loaded(many(48)));
    expect(listedTitles()).toHaveLength(48);
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("offers the first page for a link past the last", () => {
    const onPageChange = jest.fn();
    renderPublic(loaded(many(10)), { page: 9 }, onPageChange);
    expect(
      screen.getByText("Page 9 is past the last page of these contracts."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Go to the first page" }),
    );
    expect(onPageChange).toHaveBeenCalledWith(1);
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
