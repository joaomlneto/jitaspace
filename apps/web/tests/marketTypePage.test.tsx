import "@testing-library/jest-dom/jest-globals";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

interface MarketTypeRow {
  name: string;
  marketGroupId: number | null;
  group: { name: string; category: { name: string } };
}

type GenerateMarketMetadata = (input: {
  params: Promise<{ typeId: string }>;
}) => Promise<Metadata>;

const mockFindUnique =
  jest.fn<(...args: unknown[]) => Promise<MarketTypeRow | null>>();
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockUseTypeMarketOrders = jest.fn<
  (typeId: number) => {
    data: Record<string, { is_buy_order: boolean }[]>;
    isLoading: boolean;
  }
>();
const mockCapture = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    type: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));
jest.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));
jest.mock("~/lib/metadata", () => ({
  pageMetadata: ({
    title,
    description,
    path,
  }: {
    title: string;
    description: string;
    path: string;
  }) => ({
    title,
    description,
    alternates: { canonical: path },
    openGraph: { url: path },
  }),
  resolveTypeImage: () => Promise.resolve(undefined),
}));
jest.mock("@jitaspace/hooks", () => ({
  useTypeMarketOrders: (typeId: number) => mockUseTypeMarketOrders(typeId),
}));
jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: ({ typeId }: { typeId: number }) => (
    <span>{`avatar ${typeId}`}</span>
  ),
}));
jest.mock("@jitaspace/eve-icons", () => ({
  MarketIcon: () => <span>market icon</span>,
}));
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));
jest.mock("~/components/Market", () => ({
  MarketOrdersDataTable: ({
    orders,
    sortPriceDescending,
    isLoading,
  }: {
    orders: unknown[];
    sortPriceDescending: boolean;
    isLoading: boolean;
  }) => (
    <div data-testid="orders" data-loading={String(isLoading)}>
      {`${orders.length} orders; descending ${String(sortPriceDescending)}`}
    </div>
  ),
}));

const RIFTER: MarketTypeRow = {
  name: "Rifter",
  marketGroupId: 64,
  group: { name: "Frigates", category: { name: "Ship" } },
};

async function resolveServerTree(typeId: string): Promise<ReactNode> {
  const Page = require("~/app/market/[typeId]/page").default;
  const suspenseElement = Page({ params: Promise.resolve({ typeId }) });
  const contentElement = suspenseElement.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentElement.type(contentElement.props);
}

async function renderTypePage(typeId = "587") {
  const tree = await resolveServerTree(typeId);
  return render(
    <MantineProvider>
      <Suspense fallback={<div>loading</div>}>{tree}</Suspense>
    </MantineProvider>,
  );
}

describe("market item route", () => {
  beforeEach(() => {
    mockFindUnique.mockReset().mockResolvedValue(RIFTER);
    mockNotFound.mockClear();
    mockCapture.mockClear();
    mockUseTypeMarketOrders.mockReset().mockReturnValue({
      data: {},
      isLoading: false,
    });
  });

  it("server-renders the item identity and the order sections", async () => {
    await renderTypePage();

    expect(screen.getByRole("heading", { name: "Rifter" })).toBeInTheDocument();
    expect(screen.getByText("avatar 587")).toBeInTheDocument();
    expect(screen.getByText("Sell Orders")).toBeInTheDocument();
    expect(screen.getByText("Buy Orders")).toBeInTheDocument();
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { typeId: 587 } }),
    );
    expect(mockCapture).toHaveBeenCalledWith("market_item_viewed", {
      type_id: 587,
    });
  });

  it("splits regional orders into sell and buy tables", async () => {
    mockUseTypeMarketOrders.mockReturnValue({
      data: {
        10000002: [
          { is_buy_order: true },
          { is_buy_order: false },
          { is_buy_order: false },
        ],
      },
      isLoading: false,
    });

    await renderTypePage();

    const tables = screen.getAllByTestId("orders");
    expect(tables[0]).toHaveTextContent("2 orders; descending false");
    expect(tables[1]).toHaveTextContent("1 orders; descending true");
  });

  it("keeps both order tables in their loading state", async () => {
    mockUseTypeMarketOrders.mockReturnValue({ data: {}, isLoading: true });

    await renderTypePage();

    for (const table of screen.getAllByTestId("orders")) {
      expect(table).toHaveAttribute("data-loading", "true");
    }
  });

  it.each(["0", "0587", "587.0", "not-a-number"])(
    "404s the non-canonical id %p without querying",
    async (typeId) => {
      await expect(resolveServerTree(typeId)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockFindUnique).not.toHaveBeenCalled();
    },
  );

  it("404s a missing or non-marketable item", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(resolveServerTree("999999")).rejects.toThrow("NEXT_NOT_FOUND");

    mockFindUnique.mockResolvedValue({ ...RIFTER, marketGroupId: null });
    await expect(resolveServerTree("587")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets a database failure escape instead of caching it as a 404", async () => {
    mockFindUnique.mockRejectedValue(new Error("database unavailable"));

    await expect(resolveServerTree("587")).rejects.toThrow(
      "database unavailable",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("emits item-specific metadata with a self-canonical", async () => {
    const { generateMetadata } = require("~/app/market/[typeId]/page") as {
      generateMetadata: GenerateMarketMetadata;
    };

    const metadata = await generateMetadata({
      params: Promise.resolve({ typeId: "587" }),
    });

    expect(metadata.title).toBe("Rifter Market");
    expect(metadata.description).toContain("Rifter");
    expect(metadata.alternates?.canonical).toBe("/market/587");
    expect(metadata.openGraph?.url).toBe("/market/587");
  });

  it("emits no metadata for a duplicate spelling or missing item", async () => {
    const { generateMetadata } = require("~/app/market/[typeId]/page") as {
      generateMetadata: GenerateMarketMetadata;
    };

    expect(
      await generateMetadata({
        params: Promise.resolve({ typeId: "0587" }),
      }),
    ).toEqual({});
    expect(mockFindUnique).not.toHaveBeenCalled();

    mockFindUnique.mockResolvedValue(null);
    expect(
      await generateMetadata({ params: Promise.resolve({ typeId: "999999" }) }),
    ).toEqual({});
  });
});

describe("market landing page", () => {
  it("invites the user to choose an item", () => {
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
