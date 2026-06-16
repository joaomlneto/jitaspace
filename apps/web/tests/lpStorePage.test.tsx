import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
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
