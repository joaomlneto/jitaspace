import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";

import type * as PageModule from "../app/contracts/[contractId]/page";
import type * as ClientModule from "../app/contracts/[contractId]/page.client";
import type {
  ContractDetail,
  ContractItemDetail,
} from "~/app/contracts/[contractId]/data";
import type { ContractSummary } from "~/components/Contracts/contract";

// /contracts/[contractId]: the server page (metadata, the id guard, the read)
// and the client page that merges our snapshot with what ESI shows the
// visitor's characters.

const mockReadContractDetail =
  jest.fn<(id: number) => Promise<ContractDetail | null>>();
jest.mock("~/app/contracts/[contractId]/data", () => ({
  readContractDetail: (id: number) => mockReadContractDetail(id),
}));

const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  usePathname: () => "/contracts/1",
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

type EsiView = Record<string, unknown>;
const mockUseAuthenticatedContract = jest.fn<(id: number) => EsiView>();
jest.mock("@jitaspace/hooks", () => ({
  ...jest.requireActual<object>("@jitaspace/hooks"),
  useAuthenticatedContract: (id: number) => mockUseAuthenticatedContract(id),
}));

// The contract icons render as tagged images; every other EVE icon as nothing.
jest.mock("@jitaspace/eve-icons", () => {
  const React = require("react");
  const icon =
    (name: string) =>
    ({ alt }: { alt?: string }) =>
      React.createElement("img", { "data-icon": name, alt });
  const icons: Record<string, unknown> = {
    ContractAuctionIcon: icon("auction"),
    ContractCourierIcon: icon("courier"),
    ContractItemExchangeIcon: icon("item-exchange"),
  };
  return new Proxy(icons, {
    get: (target, key: string) => target[key] ?? (() => null),
  });
});

// The shared stubs, with anything they lack rendering its children.
const mockWithPassThrough = (stub: object) => {
  const React = require("react");
  const passThrough = ({ children }: { children?: unknown }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy(stub as Record<string, unknown>, {
    get: (target, key: string) => (key in target ? target[key] : passThrough),
  });
};
jest.mock("@jitaspace/ui", () =>
  mockWithPassThrough(jest.requireActual("@jitaspace/ui")),
);
jest.mock("@jitaspace/eve-components", () =>
  mockWithPassThrough(jest.requireActual("@jitaspace/eve-components")),
);

const page = () =>
  require("../app/contracts/[contractId]/page") as typeof PageModule;
const ContractPage = () =>
  (require("../app/contracts/[contractId]/page.client") as typeof ClientModule)
    .default;

const params = (contractId: string) => Promise.resolve({ contractId });

function summary(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    contractId: 101,
    type: "item_exchange",
    title: "",
    issuerId: 90000001,
    issuerName: "Issuer",
    issuerCorporationId: 98000001,
    issuerCorporationName: "Corp",
    forCorporation: false,
    dateIssued: "2026-11-01T00:00:00.000Z",
    dateExpired: "2026-11-15T00:00:00.000Z",
    daysToComplete: null,
    volume: 2500,
    price: 1_000_000,
    reward: null,
    collateral: null,
    buyout: null,
    start: {
      locationId: 60003760,
      kind: "station",
      name: "Jita IV - Moon 4",
      solarSystemId: 30000142,
      solarSystemName: "Jita",
      securityStatus: 0.9,
    },
    end: null,
    regionId: 10000002,
    regionName: "The Forge",
    items: { count: 1, first: { typeId: 587, name: "Rifter", quantity: 1 } },
    bidCount: 0,
    highestBid: null,
    lastSeenAt: "2026-11-03T10:00:00.000Z",
    isOpen: true,
    ...overrides,
  };
}

function item(overrides: Partial<ContractItemDetail> = {}): ContractItemDetail {
  return {
    recordId: "1",
    typeId: 587,
    name: "Rifter",
    quantity: 1,
    isIncluded: true,
    isBlueprintCopy: null,
    materialEfficiency: null,
    timeEfficiency: null,
    runs: null,
    mutation: null,
    ...overrides,
  };
}

function detail(overrides: Partial<ContractDetail> = {}): ContractDetail {
  return {
    contract: summary(),
    items: [item()],
    bids: [],
    firstSeenAt: "2026-10-30T00:00:00.000Z",
    endReason: null,
    ...overrides,
  };
}

const NO_ESI: EsiView = {
  contract: undefined,
  source: undefined,
  items: undefined,
  bids: undefined,
  isPending: false,
  isLoadingDetails: false,
};

beforeEach(() => {
  mockReadContractDetail.mockReset();
  mockNotFound.mockClear();
  mockUseAuthenticatedContract.mockReset();
  mockUseAuthenticatedContract.mockReturnValue(NO_ESI);
});

describe("generateMetadata", () => {
  it("describes nothing for an id that cannot exist", async () => {
    for (const raw of ["0", "abc", "2147483648"]) {
      expect(await page().generateMetadata({ params: params(raw) })).toEqual(
        {},
      );
    }
    expect(mockReadContractDetail).not.toHaveBeenCalled();
  });

  it("keeps a contract we never recorded out of the index", async () => {
    mockReadContractDetail.mockResolvedValue(null);
    const metadata = await page().generateMetadata({ params: params("42") });
    expect(metadata.title).toBe("Contract #42");
    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.alternates?.canonical).toBe("/contracts/42");
  });

  it("titles a contract by its first item and how many more it holds", async () => {
    mockReadContractDetail.mockResolvedValue(
      detail({
        contract: summary({
          type: "auction",
          items: {
            count: 3,
            first: { typeId: 587, name: "Rifter", quantity: 1 },
          },
        }),
      }),
    );
    const metadata = await page().generateMetadata({ params: params("101") });
    expect(metadata.title).toBe("Rifter + 2 more — Auction Contract");
    expect(metadata.description).toBe(
      "Auction contract #101 in Jita on EVE Online's public contract market — its items, bids and terms.",
    );
  });

  it("falls back to the contract's title, then to its id", async () => {
    mockReadContractDetail.mockResolvedValue(
      detail({
        contract: summary({
          title: "Want ores",
          items: { count: 0, first: null },
        }),
      }),
    );
    expect(
      (await page().generateMetadata({ params: params("101") })).title,
    ).toBe("Want ores — Item Exchange Contract");

    mockReadContractDetail.mockResolvedValue(
      detail({
        contract: summary({
          type: "courier",
          items: undefined,
          start: null,
          regionName: null,
        }),
      }),
    );
    const courier = await page().generateMetadata({ params: params("101") });
    expect(courier.title).toBe("Courier Contract #101");
    expect(courier.description).toBe(
      "Courier contract #101 on EVE Online's public contract market — its items and terms.",
    );
  });
});

describe("the server page", () => {
  /** Renders the page down to what its Suspense boundary resolves to. */
  async function resolve(raw: string) {
    const boundary = page().default({ params: params(raw) }) as ReactElement<{
      children: ReactElement<{ params: Promise<{ contractId: string }> }>;
    }>;
    const content = boundary.props.children;
    const Content = content.type as (
      props: typeof content.props,
    ) => Promise<ReactElement<{ contractId: number; detail: unknown }>>;
    return Content(content.props);
  }

  it("prerenders only a placeholder id", () => {
    expect(page().generateStaticParams()).toEqual([{ contractId: "0" }]);
  });

  it("404s an id that cannot exist, without a query", async () => {
    await expect(resolve("0")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(resolve("2147483648")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockReadContractDetail).not.toHaveBeenCalled();
  });

  it("hands the client a contract we never recorded as null, not a 404", async () => {
    mockReadContractDetail.mockResolvedValue(null);
    const element = await resolve("42");
    expect(element.props).toEqual({ contractId: 42, detail: null });
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("lets a database failure throw", async () => {
    mockReadContractDetail.mockRejectedValue(new Error("db down"));
    await expect(resolve("42")).rejects.toThrow("db down");
  });
});

const renderPage = (props: {
  contractId: number;
  detail: ContractDetail | null;
}) => {
  const Page = ContractPage();
  return render(
    <MantineProvider>
      <Page {...props} />
    </MantineProvider>,
  );
};

describe("ContractPage", () => {
  it("looks for an unrecorded contract through ESI, then says it is not available", () => {
    mockUseAuthenticatedContract.mockReturnValue({
      ...NO_ESI,
      isPending: true,
    });
    const { rerender } = renderPage({ contractId: 42, detail: null });
    expect(screen.getByText("Looking for contract #42…")).toBeInTheDocument();

    mockUseAuthenticatedContract.mockReturnValue(NO_ESI);
    const Page = ContractPage();
    rerender(
      <MantineProvider>
        <Page contractId={42} detail={null} />
      </MantineProvider>,
    );
    expect(
      screen.getByText("Contract #42 is not available"),
    ).toBeInTheDocument();
  });

  it("shows a recorded contract's terms, items and listing history", () => {
    renderPage({
      contractId: 101,
      detail: detail({
        contract: summary({
          items: {
            count: 3,
            first: { typeId: 587, name: "Rifter", quantity: 1 },
          },
        }),
        items: [
          item({ recordId: "1", name: "Rifter" }),
          item({
            recordId: "2",
            typeId: 691,
            name: "Rifter Blueprint",
            isBlueprintCopy: true,
            runs: 10,
            materialEfficiency: 10,
            timeEfficiency: 20,
          }),
          item({
            recordId: "3",
            typeId: 47740,
            name: "Abyssal Damage Control",
            mutation: {
              itemId: "1",
              sourceTypeId: 2048,
              mutatorTypeId: 52230,
              mutatorName: null,
            },
          }),
          item({
            recordId: "4",
            typeId: 34,
            name: "Tritanium",
            isIncluded: false,
          }),
        ],
      }),
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Rifter + 2 more" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    // Items both ways: what the acceptor gets and what they give.
    expect(screen.getByText("You get")).toBeInTheDocument();
    expect(screen.getByText("You give")).toBeInTheDocument();
    expect(
      screen.getByText("Copy · 10 runs · ME 10 · TE 20"),
    ).toBeInTheDocument();
    expect(screen.getByText("Mutated")).toBeInTheDocument();
    expect(screen.getByText("Mutaplasmid applied")).toBeInTheDocument();
    expect(screen.getByText("2026-10-30 → 2026-11-03")).toBeInTheDocument();
    expect(screen.getByText("2026-11-01 00:00 EVE")).toBeInTheDocument();
    // An item exchange has no bids section.
    expect(screen.queryByText("No bids recorded yet.")).toBeNull();
  });

  it.each([
    ["Expired", ", when it expired."],
    [null, " before it expired — it was accepted, completed or deleted."],
  ] as const)(
    "explains a contract that left the listing (%s)",
    (endReason, ending) => {
      renderPage({
        contractId: 101,
        detail: detail({
          contract: summary({ isOpen: false }),
          endReason,
        }),
      });
      expect(screen.getByText("No longer listed")).toBeInTheDocument();
      expect(
        screen.getByText(/The public listing stopped showing this contract/)
          .textContent,
      ).toBe(
        `The public listing stopped showing this contract after 2026-11-03 10:00 EVE${ending}`,
      );
    },
  );

  it("says a courier's cargo is not public, and where it goes", () => {
    renderPage({
      contractId: 101,
      detail: detail({
        contract: summary({
          type: "courier",
          price: null,
          reward: 5_000_000,
          collateral: 100_000_000,
          daysToComplete: 3,
          items: { count: 0, first: null },
        }),
        items: [],
      }),
    });
    expect(screen.getByText("Pick up")).toBeInTheDocument();
    expect(screen.getByText("Deliver to")).toBeInTheDocument();
    expect(screen.getByText("3 days to complete")).toBeInTheDocument();
    expect(
      screen.getByText(/Courier contracts do not list their cargo publicly/),
    ).toBeInTheDocument();
    expect(screen.getByText("Reward")).toBeInTheDocument();
    expect(screen.getByText("Collateral")).toBeInTheDocument();
  });

  it("lists an auction's recorded bids without bidders", () => {
    renderPage({
      contractId: 101,
      detail: detail({
        contract: summary({ type: "auction", highestBid: 8e6 }),
        bids: [
          { bidId: 1, amount: 8e6, dateBid: "2026-11-02T00:00:00.000Z" },
          { bidId: 2, amount: 9e6, dateBid: "2026-11-02T12:00:00.000Z" },
        ],
      }),
    });
    expect(screen.getByText("Bids")).toBeInTheDocument();
    // The hero's highest bid is the top of the bids, not the snapshot's.
    expect(screen.getByText("Highest bid")).toBeInTheDocument();
    expect(screen.getByText("Starting bid")).toBeInTheDocument();
    expect(screen.queryByText("Bidder")).toBeNull();
  });

  it("says when an auction has no bids", () => {
    renderPage({
      contractId: 101,
      detail: detail({ contract: summary({ type: "auction" }) }),
    });
    expect(screen.getByText("No bids recorded yet.")).toBeInTheDocument();
    expect(screen.queryByText("Highest bid")).toBeNull();
  });

  it("shows a private contract from ESI, with its bidders", () => {
    mockUseAuthenticatedContract.mockReturnValue({
      ...NO_ESI,
      contract: {
        contract_id: 7,
        type: "auction",
        status: "outstanding",
        availability: "personal",
        title: "For you",
        issuer_id: 90000001,
        issuer_corporation_id: 98000001,
        for_corporation: true,
        date_issued: "2026-11-01T00:00:00Z",
        date_expired: "2026-11-15T00:00:00Z",
        price: 1000,
        reward: 0,
        collateral: 0,
        buyout: 0,
        volume: 0,
        start_location_id: 60003760,
        end_location_id: 60003760,
        acceptor_id: 0,
        assignee_id: 90000002,
        days_to_complete: 0,
        sources: [{ kind: "character", subjectId: 90000001 }],
      },
      source: { kind: "character", subjectId: 90000001 },
      items: [
        {
          record_id: 1,
          type_id: 691,
          quantity: 1,
          is_included: true,
          is_singleton: true,
          raw_quantity: -2,
        },
      ],
      bids: [
        {
          bid_id: 1,
          bidder_id: 90000003,
          amount: 2000,
          date_bid: "2026-11-02T00:00:00Z",
        },
        {
          bid_id: 2,
          bidder_id: 90000004,
          amount: 3000,
          date_bid: "2026-11-03T00:00:00Z",
        },
      ],
    });
    renderPage({ contractId: 7, detail: null });

    // Capitalised by CSS, so the text is ESI's own.
    expect(screen.getByText("personal")).toBeInTheDocument();
    expect(screen.getByText("For corporation")).toBeInTheDocument();
    expect(screen.getByText("“For you”")).toBeInTheDocument();
    // ESI's -2 marks a blueprint copy.
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Bidder")).toBeInTheDocument();
    const bids = screen.getByText("Bidder").closest("table");
    expect(bids).not.toBeNull();
    expect(within(bids as HTMLElement).getAllByRole("row")).toHaveLength(3);
  });

  it("prefers ESI's live status, keeping our names and region", () => {
    mockUseAuthenticatedContract.mockReturnValue({
      ...NO_ESI,
      contract: {
        contract_id: 101,
        type: "item_exchange",
        status: "finished",
        availability: "public",
        title: "",
        issuer_id: 90000001,
        issuer_corporation_id: 98000001,
        for_corporation: false,
        date_issued: "2026-11-01T00:00:00Z",
        date_expired: "2026-11-15T00:00:00Z",
        price: 1_000_000,
        start_location_id: 60003760,
        end_location_id: 60003760,
        acceptor_id: 0,
        assignee_id: 0,
        days_to_complete: 0,
        sources: [{ kind: "corporation", subjectId: 98000001 }],
      },
      source: { kind: "corporation", subjectId: 98000001 },
      // ESI's items lose to ours, which carry blueprint details.
      items: [],
    });
    renderPage({
      contractId: 101,
      detail: detail({ contract: summary({ isOpen: false }) }),
    });

    expect(screen.getByText("Finished")).toBeInTheDocument();
    // ESI still shows it, so the "left the listing" note does not apply.
    expect(
      screen.queryByText(/The public listing stopped showing this contract/),
    ).toBeNull();
    expect(screen.getAllByText("The Forge").length).toBeGreaterThan(0);
    expect(screen.getByText("Items")).toBeInTheDocument();
  });

  it("waits on ESI for the items of a contract we did not record", () => {
    mockUseAuthenticatedContract.mockReturnValue({
      ...NO_ESI,
      contract: {
        contract_id: 8,
        type: "item_exchange",
        status: "outstanding",
        availability: "personal",
        title: "",
        issuer_id: 90000001,
        issuer_corporation_id: 98000001,
        for_corporation: false,
        date_issued: "2026-11-01T00:00:00Z",
        date_expired: "2026-11-15T00:00:00Z",
        start_location_id: 60003760,
        end_location_id: 60003760,
        acceptor_id: 0,
        assignee_id: 90000002,
        days_to_complete: 0,
        sources: [{ kind: "character", subjectId: 90000001 }],
      },
      source: { kind: "character", subjectId: 90000001 },
      isLoadingDetails: true,
    });
    renderPage({ contractId: 8, detail: null });
    expect(screen.getByText("Loading items…")).toBeInTheDocument();
  });
});
