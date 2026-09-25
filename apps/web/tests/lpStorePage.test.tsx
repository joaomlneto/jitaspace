import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The LP Store page client is a presentational component: it takes corporation
// + offers + types as props and lays out a breadcrumb header over a
// LoyaltyPointsTable. The route's page.tsx is an async Server Component that
// fetches via Prisma, so it cannot be unit-rendered — page.client carries the
// renderable UI and is exercised here.
// ---------------------------------------------------------------------------

jest.mock("@jitaspace/eve-icons", () => ({
  LPStoreIcon: () => <span data-testid="lp-store-icon" />,
}));

// Pass-through @jitaspace/ui Proxy so wrapping components keep their children.
jest.mock(
  "@jitaspace/ui",
  () =>
    new Proxy(
      {},
      {
        get:
          () =>
          ({ children }: { children?: React.ReactNode } = {}) =>
            children ?? null,
      },
    ),
);

const corporationFindFirst = jest.fn<
  (a?: unknown) => Promise<{
    corporationId: number;
    name: string;
    ticker?: string | null;
  } | null>
>();
const loyaltyStoreOfferCount = jest.fn<(a?: unknown) => Promise<number>>();
const loyaltyStoreOfferFindMany =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown>[]>>();
const typeFindMany =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown>[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    corporation: {
      findFirst: (a?: unknown) => corporationFindFirst(a),
    },
    loyaltyStoreOffer: {
      findMany: (a?: unknown) => loyaltyStoreOfferFindMany(a),
      count: (a?: unknown) => loyaltyStoreOfferCount(a),
    },
    type: { findMany: (a?: unknown) => typeFindMany(a) },
  },
}));

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

jest.mock("~/components/LPStore", () => ({
  LoyaltyPointsTable: ({
    corporations,
    offers,
    types,
  }: {
    corporations: { name: string }[];
    offers: unknown[];
    types: unknown[];
  }) => (
    <div data-testid="lp-table">
      {`corps:${corporations.length} offers:${offers.length} types:${types.length}`}
    </div>
  ),
}));

const CORPORATION = { corporationId: 1000035, name: "Caldari Navy" };

const OFFERS = [
  {
    offerId: 1,
    corporationId: 1000035,
    typeId: 2929,
    quantity: 1,
    akCost: null,
    lpCost: 1500,
    iskCost: 5_000_000,
    requiredItems: [{ typeId: 34, quantity: 10 }],
  },
  {
    offerId: 2,
    corporationId: 1000035,
    typeId: 2930,
    quantity: 5,
    akCost: 2,
    lpCost: 3000,
    iskCost: 12_000_000,
    requiredItems: [],
  },
];

const TYPES = [
  { typeId: 2929, name: "Caldari Navy Antimatter" },
  { typeId: 2930, name: "Caldari Navy Iron" },
  { typeId: 34, name: "Tritanium" },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/lp-store/[corporationId]/page.client").default;
  const defaults = {
    corporation: CORPORATION,
    offers: OFFERS,
    types: TYPES,
  };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("LP Store corporation page (client)", () => {
  it("renders the breadcrumb header and forwards data to the table", () => {
    renderPage();

    // Breadcrumb: LP Store link + corporation name title.
    expect(screen.getByText("LP Store")).toBeInTheDocument();
    expect(screen.getByText("Caldari Navy")).toBeInTheDocument();
    expect(screen.getByTestId("lp-store-icon")).toBeInTheDocument();

    // The table receives the corporation, offers and types as-is.
    expect(screen.getByTestId("lp-table")).toHaveTextContent(
      "corps:1 offers:2 types:3",
    );
  });

  it("renders with no offers", () => {
    renderPage({ offers: [], types: [] });

    expect(screen.getByText("Caldari Navy")).toBeInTheDocument();
    expect(screen.getByTestId("lp-table")).toHaveTextContent(
      "corps:1 offers:0 types:0",
    );
  });
});

// The server wrapper resolves `params` inside the Suspense boundary, so reach
// its content component the same way React would rather than rendering the
// async function as a client component.
async function resolvePageContent(corporationId: string) {
  const Page = require("~/app/lp-store/[corporationId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ corporationId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

/** The `where` the route looked the store's corporation up by. */
function lookupWhere(call = 0) {
  const arg = corporationFindFirst.mock.calls[call]?.[0] as {
    where: Record<string, unknown>;
  };
  return arg.where;
}

function metadataFor(corporationId: string) {
  const { generateMetadata } = require("~/app/lp-store/[corporationId]/page");
  return generateMetadata({ params: Promise.resolve({ corporationId }) });
}

// This segment is dual-purpose — a store is reachable as `/lp-store/1000035`
// and as `/lp-store/Caldari_Navy` — so unlike the pure-id routes it cannot
// reject everything non-numeric. What it must reject is a second *spelling* of
// a real id, which falls through to the name lookup and reaches not-found.
describe("LP Store corporation lookup", () => {
  beforeEach(() => {
    corporationFindFirst.mockReset();
    loyaltyStoreOfferFindMany.mockReset().mockResolvedValue([]);
    loyaltyStoreOfferCount.mockReset().mockResolvedValue(12);
    typeFindMany.mockReset().mockResolvedValue([]);
  });

  it("looks the corporation up by id for the canonical spelling", async () => {
    corporationFindFirst.mockResolvedValue(CORPORATION);

    const tree = (await resolvePageContent("1000035")) as { type: unknown };

    expect(lookupWhere()).toEqual({ corporationId: 1000035 });
    expect(tree.type).toBe(
      require("~/app/lp-store/[corporationId]/page.client").default,
    );
  });

  it("resolves a store linked by underscored corporation name", async () => {
    corporationFindFirst.mockResolvedValue(CORPORATION);

    await resolvePageContent("Caldari_Navy");

    expect(lookupWhere()).toEqual({ name: "Caldari Navy" });
  });

  it.each(["01000035", "1000035.0", "+1000035"])(
    "does not resolve %p by id, so the duplicate URL reaches not-found",
    async (corporationId) => {
      corporationFindFirst.mockResolvedValue(null);

      await expect(resolvePageContent(corporationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(lookupWhere()).toEqual({ name: corporationId });
    },
  );
});

// The index links stores by name, the sitemap advertises them by name, and the
// id form still resolves — so both must declare the same title and the same
// canonical, the name form. Only the id form used to get any metadata at all.
describe("LP Store corporation metadata", () => {
  beforeEach(() => {
    corporationFindFirst.mockReset();
    loyaltyStoreOfferCount.mockReset().mockResolvedValue(12);
  });

  it("gives the id and name forms identical metadata, canonical to the name", async () => {
    corporationFindFirst.mockResolvedValue({ ...CORPORATION, ticker: "CN" });

    const byId = await metadataFor("1000035");
    const byName = await metadataFor("Caldari_Navy");

    expect(byId).toEqual(byName);
    expect(byId).toEqual(
      expect.objectContaining({
        title: `${CORPORATION.name} LP Store`,
        alternates: { canonical: "/lp-store/Caldari_Navy" },
      }),
    );
    expect(lookupWhere(0)).toEqual({ corporationId: 1000035 });
    expect(lookupWhere(1)).toEqual({ name: "Caldari Navy" });
  });

  it("keeps punctuation in the canonical exactly as the index links it", async () => {
    corporationFindFirst.mockResolvedValue({
      corporationId: 1000140,
      name: "Mordu's Legion",
      ticker: null,
    });

    expect(await metadataFor("Mordu's_Legion")).toEqual(
      expect.objectContaining({
        alternates: { canonical: "/lp-store/Mordu's_Legion" },
      }),
    );
    expect(lookupWhere()).toEqual({ name: "Mordu's Legion" });
  });

  it("emits nothing for a segment that names no store", async () => {
    corporationFindFirst.mockResolvedValue(null);

    expect(await metadataFor("No_Such_Corp")).toEqual({});
    expect(loyaltyStoreOfferCount).not.toHaveBeenCalled();
  });

  it("emits nothing when the lookup fails, so a failed read is never canonicalised", async () => {
    corporationFindFirst.mockRejectedValue(new Error("db down"));

    expect(await metadataFor("1000035")).toEqual({});
  });
});
