import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
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
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { ContractView } from "~/app/contracts/ContractList";
import type * as FiltersBarModule from "~/app/contracts/FiltersBar";
import type * as ListPageModule from "~/app/contracts/page.client";
import type { ContractFilterUpdate } from "~/app/contracts/useContractFilters";
import type * as FiltersHookModule from "~/app/contracts/useContractFilters";
import type { OpenContracts } from "~/app/contracts/useOpenContracts";
import type { ContractRegionFacet } from "~/components/Contracts/clientFilter";
import type { ContractSummary } from "~/components/Contracts/contract";
import type { ContractFilters } from "~/components/Contracts/filters";

// The /contracts filter bar, the URL state behind it, and the page that wires
// the two to the contract lists.

jest.mock("@jitaspace/eve-icons", () => {
  return new Proxy({}, { get: () => () => null });
});
// The lists have tests of their own: here they only report what they were given.
jest.mock("~/app/contracts/MyContracts", () => {
  const React = require("react");
  return {
    MyContracts: ({
      filters,
      view,
    }: {
      filters: ContractFilters;
      view: ContractView;
    }) =>
      React.createElement(
        "output",
        { "data-testid": "mine" },
        JSON.stringify({ ...filters, view }),
      ),
  };
});
jest.mock("~/app/contracts/PublicContracts", () => {
  const React = require("react");
  return {
    PublicContracts: ({
      onPageChange,
    }: {
      onPageChange: (page: number) => void;
    }) =>
      React.createElement(
        "button",
        { onClick: () => onPageChange(2) },
        "Next page",
      ),
  };
});

// The open contracts the page loads in the browser, as each test sets them.
const mockUseOpenContracts = jest.fn<() => OpenContracts>();
jest.mock("~/app/contracts/useOpenContracts", () => ({
  useOpenContracts: () => mockUseOpenContracts(),
}));

// Mantine's Select scrolls the selected option into view; jsdom cannot.
Element.prototype.scrollIntoView = () => undefined;

const { FiltersBar } =
  require("~/app/contracts/FiltersBar") as typeof FiltersBarModule;
const { useContractFilters } =
  require("~/app/contracts/useContractFilters") as typeof FiltersHookModule;
const ContractsPage = (
  require("~/app/contracts/page.client") as typeof ListPageModule
).default;

const FILTERS: ContractFilters = {
  type: "all",
  regionId: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  page: 1,
};

const REGIONS: ContractRegionFacet[] = [
  { regionId: 10000002, name: "The Forge", count: 12345 },
  { regionId: 10000043, name: "Domain", count: 678 },
];

function renderBar(filters: Partial<ContractFilters> = {}) {
  const update = jest.fn<(changes: ContractFilterUpdate) => void>();
  const reset = jest.fn();
  const onViewChange = jest.fn();
  const bar = (next: Partial<ContractFilters>) => (
    <MantineProvider>
      <FiltersBar
        filters={{ ...FILTERS, ...next }}
        regions={REGIONS}
        update={update}
        reset={reset}
        view="rows"
        onViewChange={onViewChange}
      />
    </MantineProvider>
  );
  const utils = render(bar(filters));
  return {
    ...utils,
    update,
    reset,
    onViewChange,
    rerenderWith: (next: Partial<ContractFilters>) => utils.rerender(bar(next)),
  };
}

const searchBox = () =>
  screen.getByRole<HTMLInputElement>("textbox", {
    name: "Search contracts",
  });

describe("FiltersBar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("offers Clear filters only once something is filtered", () => {
    const { reset, rerenderWith } = renderBar();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();

    rerenderWith({ sort: "oldest" });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(reset).toHaveBeenCalled();
  });

  it.each([
    { type: "courier" as const },
    { regionId: 10000002 },
    { q: "drake" },
    { minPrice: 1 },
    { maxPrice: 1 },
  ])("counts %o as filtered", (filters) => {
    renderBar(filters);
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("switches the contract type and the view", () => {
    const { update, onViewChange } = renderBar();
    fireEvent.click(screen.getByRole("radio", { name: "Auction" }));
    expect(update).toHaveBeenCalledWith({ type: "auction" });
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    expect(onViewChange).toHaveBeenCalledWith("table");
  });

  it("commits the search once typing pauses, trimmed, keeping the field as typed", () => {
    const { update, rerenderWith } = renderBar();
    fireEvent.change(searchBox(), { target: { value: "drake " } });
    expect(update).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(update).toHaveBeenCalledWith({ q: "drake" });

    // The URL now holds the trimmed draft: the space just typed stays, so the
    // next word can follow it.
    rerenderWith({ q: "drake" });
    expect(searchBox().value).toBe("drake ");

    // A change from elsewhere (Clear filters, the back button) is followed.
    rerenderWith({ q: "" });
    expect(searchBox().value).toBe("");
  });

  it("clears the search from its own button", () => {
    const { update } = renderBar({ q: "drake" });
    expect(searchBox().value).toBe("drake");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(searchBox().value).toBe("");
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(update).toHaveBeenCalledWith({ q: "" });
  });

  it("commits price bounds once typing pauses", () => {
    const { update } = renderBar();
    fireEvent.change(screen.getByRole("textbox", { name: "Minimum price" }), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Maximum price" }), {
      target: { value: "5000" },
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(update).toHaveBeenCalledWith({ minPrice: 1000 });
    expect(update).toHaveBeenCalledWith({ maxPrice: 5000 });
  });

  it("calls a courier's price its reward", () => {
    renderBar({ type: "courier" });
    expect(screen.getByText("ISK reward")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Minimum reward" }),
    ).toBeInTheDocument();
  });

  it("lists regions with their open contract counts, and picks one", async () => {
    jest.useRealTimers();
    const { update } = renderBar();
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    fireEvent.click(
      await screen.findByRole("option", {
        name: `Domain (${(678).toLocaleString()})`,
      }),
    );
    expect(update).toHaveBeenCalledWith({ region: 10000043 });
    expect(
      screen.getByRole("option", {
        name: `The Forge (${(12345).toLocaleString()})`,
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("changes the sort", async () => {
    jest.useRealTimers();
    const { update } = renderBar();
    fireEvent.click(screen.getByRole("combobox", { name: "Sort contracts" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Expiring soonest" }),
    );
    expect(update).toHaveBeenCalledWith({ sort: "expiring" });
  });
});

describe("useContractFilters", () => {
  function renderFilters(searchParams: string) {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    const hook = renderHook(() => useContractFilters(), {
      wrapper: withNuqsTestingAdapter({
        searchParams,
        onUrlUpdate,
        hasMemory: true,
      }),
    });
    return { ...hook, onUrlUpdate };
  }

  const lastUrl = (onUrlUpdate: jest.Mock<OnUrlUpdateFunction>) =>
    onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

  it("reads the URL, dropping values no filter can have", () => {
    const { result } = renderFilters(
      "?type=auction&region=0&q=%20drake%20&minPrice=-5&maxPrice=7&sort=nope&page=0",
    );
    expect(result.current.filters).toEqual({
      type: "auction",
      regionId: null,
      q: "drake",
      minPrice: null,
      maxPrice: 7,
      sort: "newest",
      page: 1,
    });
  });

  it("defaults to every open contract, newest first", () => {
    const { result } = renderFilters("");
    expect(result.current.filters).toEqual(FILTERS);
  });

  it("returns to the first page when a filter changes", async () => {
    const { result, onUrlUpdate } = renderFilters("?page=4&region=10000002");
    act(() => {
      result.current.update({ type: "courier" });
    });
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?region=10000002&type=courier"),
    );
    expect(result.current.filters.page).toBe(1);
  });

  it("keeps a page change", async () => {
    const { result, onUrlUpdate } = renderFilters("?type=courier");
    act(() => {
      result.current.update({ page: 3 });
    });
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?type=courier&page=3"),
    );
    expect(result.current.filters.page).toBe(3);
  });

  it("clears every filter", async () => {
    const { result, onUrlUpdate } = renderFilters("?type=courier&q=x&page=2");
    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(""));
    expect(result.current.filters).toEqual(FILTERS);
  });
});

describe("ContractsPage", () => {
  /** An open contract in a region, of a kind. */
  const open = (
    contractId: number,
    regionId: number,
    regionName: string,
    type: ContractSummary["type"] = "item_exchange",
  ) => ({
    contract: {
      contractId,
      type,
      title: `Contract ${contractId}`,
      issuerId: 1,
      issuerCorporationId: 2,
      forCorporation: false,
      dateIssued: "2026-11-01T00:00:00.000Z",
      dateExpired: "2026-11-30T00:00:00.000Z",
      daysToComplete: null,
      volume: null,
      price: 1000,
      reward: null,
      collateral: null,
      buyout: null,
      start: null,
      end: null,
      regionId,
      regionName,
    },
    search: `contract ${contractId}`,
    typeIds: [],
  });

  const snapshot = (overrides: Partial<OpenContracts> = {}): OpenContracts => ({
    contracts: [
      open(1, 10000002, "The Forge"),
      open(2, 10000002, "The Forge"),
      open(3, 10000002, "The Forge", "courier"),
      open(4, 10000043, "Domain", "courier"),
    ],
    isPending: false,
    isError: false,
    snapshotAt: "2026-11-04T10:30:00.000Z",
    isBackfilling: false,
    ...overrides,
  });

  const renderPage = (
    value: OpenContracts,
    searchParams = "",
    wrapper?: ({ children }: { children: ReactNode }) => ReactNode,
  ) => {
    mockUseOpenContracts.mockReturnValue(value);
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    render(
      <MantineProvider>
        <ContractsPage />
      </MantineProvider>,
      {
        wrapper:
          wrapper ??
          withNuqsTestingAdapter({
            searchParams,
            onUrlUpdate,
            hasMemory: true,
          }),
      },
    );
    return { onUrlUpdate };
  };

  const mine = () =>
    JSON.parse(screen.getByTestId("mine").textContent) as Record<
      string,
      unknown
    >;

  it("summarises the open contracts and how current they are", () => {
    renderPage(snapshot());
    expect(
      screen.getByText(
        "4 open public contracts across 2 regions, and your own.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Public contracts as of 2026-11-04 10:30 EVE time."),
    ).toBeInTheDocument();
  });

  it("describes the listing in general until it has loaded", () => {
    renderPage(snapshot({ contracts: [], isPending: true, snapshotAt: null }));
    expect(
      screen.getByText("Open public contracts across New Eden, and your own."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Public contracts as of/),
    ).not.toBeInTheDocument();
  });

  it("explains a snapshot still being backfilled", () => {
    renderPage(
      snapshot({ snapshotAt: "2024-03-01T00:00:00.000Z", isBackfilling: true }),
    );
    expect(
      screen.getByText("Public contracts as of 2024-03-01"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/have reached 2024-03-01 00:00 EVE time/),
    ).toBeInTheDocument();
  });

  it("counts each region's contracts under the other filters", async () => {
    renderPage(snapshot());
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    expect(
      await screen.findByRole("option", { name: "The Forge (3)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Domain (1)", hidden: true }),
    ).toBeInTheDocument();
  });

  it("narrows the region counts to the contract type picked", async () => {
    renderPage(snapshot(), "?type=courier&region=10000043");
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    // The region filter itself does not narrow its own counts.
    expect(
      await screen.findByRole("option", {
        name: "The Forge (1)",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Domain (1)", hidden: true }),
    ).toBeInTheDocument();
  });

  it("passes the URL's filters and view to the lists, and keeps them in it", async () => {
    const { onUrlUpdate } = renderPage(snapshot(), "?type=auction&view=cards");
    expect(mine()).toMatchObject({ type: "auction", view: "cards" });
    const urlBecomes = (queryString: string) =>
      waitFor(() =>
        expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
          queryString,
        ),
      );

    fireEvent.click(screen.getByRole("radio", { name: "Courier" }));
    await urlBecomes("?type=courier&view=cards");
    expect(mine()).toMatchObject({ type: "courier" });

    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    await urlBecomes("?type=courier&view=table");
    expect(mine()).toMatchObject({ view: "table" });

    // A page change keeps the filters and the view.
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await urlBecomes("?type=courier&view=table&page=2");
    expect(mine()).toMatchObject({ page: 2, type: "courier", view: "table" });
  });
});
