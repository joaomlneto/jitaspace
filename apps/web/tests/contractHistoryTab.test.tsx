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

import type * as TabModule from "~/app/contracts/ContractHistoryTab";
import type { ContractSummary } from "~/components/Contracts/contract";
import type * as PartsModule from "~/components/Contracts/ContractParts";
import type { ContractHistoryPage } from "~/components/Contracts/history";

// The Contracts tab of character, corporation and type pages, and how a
// contract that has ended shows in the list views.

jest.mock("@jitaspace/eve-icons", () => {
  return new Proxy({}, { get: () => () => null });
});
const mockPassThrough = () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
};
jest.mock("@jitaspace/ui", () => mockPassThrough());
jest.mock("@jitaspace/eve-components", () => mockPassThrough());

const { ContractHistoryTab } =
  require("~/app/contracts/ContractHistoryTab") as typeof TabModule;
const { ContractTiming } =
  require("~/components/Contracts/ContractParts") as typeof PartsModule;

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
    items: { count: 0, first: null },
    isOpen: true,
    ...overrides,
  };
}

const page = (
  contracts: ContractSummary[],
  nextBefore: number | null = null,
): ContractHistoryPage => ({ contracts, nextBefore });

const mockFetch = jest.fn<typeof fetch>();
// jsdom has no fetch Response; the tab reads only these three members.
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

function renderTab(subject: "character" | "corporation" | "type", id: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <ContractHistoryTab subject={subject} id={id} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const requested = () => mockFetch.mock.calls.map(([url]) => url as string);

describe("ContractHistoryTab", () => {
  it("lists the subject's contracts, then the older ones on request", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        respond(
          page(
            [
              contract({ contractId: 30, title: "Newest" }),
              contract({ contractId: 20, title: "Older" }),
            ],
            20,
          ),
        ),
      )
      .mockImplementationOnce(() =>
        respond(page([contract({ contractId: 10, title: "Oldest" })])),
      );
    renderTab("corporation", 98000001);

    expect(await screen.findByText("Newest")).toBeInTheDocument();
    expect(requested()).toEqual([
      "/api/contracts/history?corporationId=98000001",
    ]);
    expect(
      screen.getByText(/issued by this corporation's members/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show older contracts" }),
    );
    expect(await screen.findByText("Oldest")).toBeInTheDocument();
    expect(requested()[1]).toBe(
      "/api/contracts/history?corporationId=98000001&before=20",
    );
    // Every page stays, and the last one offers nothing more.
    expect(screen.getByText("Older")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show older contracts" }),
    ).toBeNull();
  });

  it("says when nothing was recorded", async () => {
    mockFetch.mockImplementation(() => respond(page([])));
    renderTab("type", 587);
    expect(
      await screen.findByText("No public contracts recorded."),
    ).toBeInTheDocument();
    expect(requested()).toEqual(["/api/contracts/history?typeId=587"]);
  });

  it("says when the first page fails", async () => {
    mockFetch.mockImplementation(() => respond({ error: "x" }, 500));
    renderTab("character", 90000001);
    expect(
      await screen.findByText(
        "Contracts could not be loaded. Try again in a moment.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps what it has when an older page fails", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        respond(page([contract({ contractId: 30, title: "Kept" })], 30)),
      )
      .mockImplementationOnce(() => respond({ error: "x" }, 500));
    renderTab("character", 90000001);
    fireEvent.click(
      await screen.findByRole("button", { name: "Show older contracts" }),
    );
    expect(
      await screen.findByText(
        "Older contracts could not be loaded. Try again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Kept")).toBeInTheDocument();
  });

  it("switches between the list views", async () => {
    mockFetch.mockImplementation(() =>
      respond(page([contract({ title: "In a table" })])),
    );
    renderTab("type", 587);
    await screen.findByText("In a table");
    fireEvent.click(screen.getByLabelText("Table"));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

describe("ContractTiming", () => {
  const renderTiming = (overrides: Partial<ContractSummary>) =>
    render(
      <MantineProvider>
        <ContractTiming contract={contract(overrides)} size="xs" />
      </MantineProvider>,
    );

  it("shows when an expired contract was last listed", () => {
    renderTiming({
      isOpen: false,
      endReason: "Expired",
      lastSeenAt: "2023-05-04T12:00:00.000Z",
    });
    expect(screen.getByText("Expired 2023-05-04")).toBeInTheDocument();
  });

  it("calls a contract gone before expiry closed", () => {
    renderTiming({
      isOpen: false,
      endReason: "RemovedBeforeExpiry",
      lastSeenAt: "2023-05-04T12:00:00.000Z",
    });
    expect(screen.getByText("Closed 2023-05-04")).toBeInTheDocument();
  });

  it("says only that it ended when the snapshots kept no reason", () => {
    renderTiming({ isOpen: false, endReason: null, lastSeenAt: null });
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("prefers ESI's status, and shows an open contract's expiry", () => {
    renderTiming({ status: "finished", isOpen: false });
    expect(screen.getByText("Finished")).toBeInTheDocument();

    renderTiming({});
    expect(screen.getByText(/^Expires/)).toBeInTheDocument();
  });
});
