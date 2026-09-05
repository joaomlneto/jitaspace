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

const corporationFindFirstOrThrow =
  jest.fn<(a?: unknown) => Promise<{ corporationId: number; name: string }>>();
const loyaltyStoreOfferFindMany =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown>[]>>();
const typeFindMany =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown>[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    corporation: {
      findFirstOrThrow: (a?: unknown) => corporationFindFirstOrThrow(a),
    },
    loyaltyStoreOffer: {
      findMany: (a?: unknown) => loyaltyStoreOfferFindMany(a),
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

/** The `corporationId` arm of the OR the route looks the store up by. */
function requestedCorporationId() {
  const arg = corporationFindFirstOrThrow.mock.calls[0]?.[0] as {
    where: { OR: [{ corporationId?: number }, unknown] };
  };
  return arg.where.OR[0].corporationId;
}

// This segment is dual-purpose — the sitemap advertises `/lp-store/1000035`
// while `/lp-store` links `/lp-store/Caldari_Navy` — so unlike the pure-id
// routes it cannot reject everything non-numeric. What it must reject is a
// second *spelling* of a real id, which now falls through to the name lookup
// and 404s there.
describe("LP Store corporation lookup", () => {
  beforeEach(() => {
    corporationFindFirstOrThrow.mockReset();
    loyaltyStoreOfferFindMany.mockReset().mockResolvedValue([]);
    typeFindMany.mockReset().mockResolvedValue([]);
  });

  it("looks the corporation up by id for the canonical spelling", async () => {
    corporationFindFirstOrThrow.mockResolvedValue(CORPORATION);

    const tree = (await resolvePageContent("1000035")) as { type: unknown };

    expect(requestedCorporationId()).toBe(1000035);
    expect(tree.type).toBe(
      require("~/app/lp-store/[corporationId]/page.client").default,
    );
  });

  it("still resolves a store linked by underscored corporation name", async () => {
    corporationFindFirstOrThrow.mockResolvedValue(CORPORATION);

    await resolvePageContent("Caldari_Navy");

    // No numeric arm, so only the name arm can match.
    expect(requestedCorporationId()).toBeUndefined();
  });

  it.each(["01000035", "1000035.0", "+1000035"])(
    "does not resolve %p by id, so the duplicate URL 404s",
    async (corporationId) => {
      corporationFindFirstOrThrow.mockRejectedValue(new Error("no rows"));

      await expect(resolvePageContent(corporationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(requestedCorporationId()).toBeUndefined();
    },
  );
});
