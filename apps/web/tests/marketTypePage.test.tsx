import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

// The market item page is an async server component: it reads params, loads the
// type's name from prisma (wrapped in "use cache"), and renders a client view
// with the live order tables. We mock prisma, next/cache, next/navigation, the
// order hook, the avatar and the order table.

const mockFindUniqueOrThrow =
  jest.fn<(...args: unknown[]) => Promise<{ name: string }>>();
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockUseTypeMarketOrders =
  jest.fn<
    (typeId: number) => { data: Record<string, { is_buy_order: boolean }[]> }
  >();

jest.mock("~/lib/db", () => ({
  prisma: {
    type: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
  },
}));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));
jest.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));
jest.mock("@jitaspace/hooks", () => ({
  useTypeMarketOrders: (typeId: number) => mockUseTypeMarketOrders(typeId),
}));
jest.mock("@jitaspace/ui", () => ({
  TypeAvatar: ({ typeId }: { typeId: number }) => (
    <span>{`avatar ${typeId}`}</span>
  ),
}));
jest.mock("@jitaspace/eve-icons", () => ({
  MarketIcon: () => <span>icon</span>,
}));
jest.mock("~/components/Market", () => ({
  MarketOrdersDataTable: ({ orders }: { orders: unknown[] }) => (
    <div data-testid="orders">{`${orders.length} orders`}</div>
  ),
}));

// Page() returns <Suspense><PageContent/></Suspense>; jsdom won't await an async
// component, so we pull out the inner async element and invoke it directly —
// which also exercises the Suspense wrapper.
async function resolveServerTree(typeId: string): Promise<ReactNode> {
  const Page = require("~/app/market/[typeId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ typeId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

async function renderTypePage(typeId = "587") {
  const tree = await resolveServerTree(typeId);
  return render(
    <MantineProvider>
      <Suspense fallback={<div>loading</div>}>{tree}</Suspense>
    </MantineProvider>,
  );
}

describe("Market item page", () => {
  beforeEach(() => {
    mockFindUniqueOrThrow.mockReset();
    mockNotFound.mockClear();
    mockUseTypeMarketOrders.mockReset();
    mockUseTypeMarketOrders.mockReturnValue({ data: {} });
  });

  it("renders the item name and the buy/sell order sections", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Rifter" });

    await renderTypePage("587");

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Rifter" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Sell Orders")).toBeInTheDocument();
    expect(screen.getByText("Buy Orders")).toBeInTheDocument();
    expect(screen.getByText("avatar 587")).toBeInTheDocument();
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { typeId: 587 } }),
    );
  });

  it("splits the regional orders into sell and buy tables", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Tritanium" });
    mockUseTypeMarketOrders.mockReturnValue({
      data: {
        10000002: [
          { is_buy_order: true },
          { is_buy_order: false },
          { is_buy_order: false },
        ],
      },
    });

    await renderTypePage("34");

    await waitFor(() =>
      expect(screen.getByText("Tritanium")).toBeInTheDocument(),
    );
    const tables = screen.getAllByTestId("orders");
    expect(tables[0]).toHaveTextContent("2 orders"); // sell orders first
    expect(tables[1]).toHaveTextContent("1 orders"); // then buy orders
  });

  it("calls notFound() for a non-numeric type id", async () => {
    await expect(resolveServerTree("not-a-number")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("calls notFound() when the type lookup throws", async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error("missing"));

    await expect(resolveServerTree("999999")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("builds page metadata from the item name", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Rifter" });
    const { generateMetadata } = require("~/app/market/[typeId]/page");

    const meta = await generateMetadata({
      params: Promise.resolve({ typeId: "587" }),
    });

    expect(meta.title).toBe("Rifter — Market");
    expect(meta.description).toContain("Rifter");
  });

  it("returns empty metadata for an invalid type id", async () => {
    const { generateMetadata } = require("~/app/market/[typeId]/page");

    const meta = await generateMetadata({
      params: Promise.resolve({ typeId: "0" }),
    });

    expect(meta).toEqual({});
  });

  it("returns empty metadata when the item lookup throws", async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error("missing"));
    const { generateMetadata } = require("~/app/market/[typeId]/page");

    const meta = await generateMetadata({
      params: Promise.resolve({ typeId: "999999" }),
    });

    expect(meta).toEqual({});
  });
});

describe("Market landing page", () => {
  it("invites the user to pick an item from the market groups", () => {
    const IndexPage = require("~/app/market/page").default;

    render(
      <MantineProvider>
        <IndexPage />
      </MantineProvider>,
    );

    expect(screen.getByRole("heading", { name: "Market" })).toBeInTheDocument();
    expect(
      screen.getByText(/Select an item from the market groups/),
    ).toBeInTheDocument();
  });
});
