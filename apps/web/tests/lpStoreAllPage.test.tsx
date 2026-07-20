import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The LP Store "all offers" page client is presentational: it lays out a
// breadcrumb header over a LoyaltyPointsTable, forwarding corporations/offers/
// types as-is. The route's page.tsx is an async Server Component (Prisma
// fetch), so page.client carries the renderable UI. We stub the heavy
// LoyaltyPointsTable child with an inspector to assert the props are forwarded.
// ---------------------------------------------------------------------------

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  LPStoreIcon: () => <span data-testid="lp-store-icon" />,
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

const CORPORATIONS = [
  { corporationId: 1000035, name: "Caldari Navy" },
  { corporationId: 1000125, name: "Federation Navy" },
];

const TYPES = [
  { typeId: 2929, name: "Caldari Navy Antimatter" },
  { typeId: 34, name: "Tritanium" },
];

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
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/lp-store/all/page.client").default;
  const defaults = {
    corporations: CORPORATIONS,
    types: TYPES,
    offers: OFFERS,
  };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("LP Store all-offers page (client)", () => {
  it("renders the breadcrumb header, the LP Store back-link and the all-offers title", () => {
    renderPage();
    // Breadcrumb has the "LP Store" link plus an "All offers" title.
    expect(screen.getByText("LP Store")).toBeInTheDocument();
    expect(screen.getByText("All offers")).toBeInTheDocument();
    expect(screen.getByTestId("lp-store-icon")).toBeInTheDocument();

    expect(screen.getByText("LP Store").closest("a")).toHaveAttribute(
      "href",
      "/lp-store",
    );
  });

  it("forwards corporations, offers and types to the table", () => {
    renderPage();
    expect(screen.getByTestId("lp-table")).toHaveTextContent(
      "corps:2 offers:1 types:2",
    );
  });

  it("renders with empty data sets", () => {
    renderPage({ corporations: [], offers: [], types: [] });
    expect(screen.getByText("All offers")).toBeInTheDocument();
    expect(screen.getByTestId("lp-table")).toHaveTextContent(
      "corps:0 offers:0 types:0",
    );
  });
});
