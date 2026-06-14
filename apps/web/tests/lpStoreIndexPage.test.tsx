import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The LP Store index page client is presentational: it takes a list of
// corporations and renders a header, an "all offers" link, and a grid of
// per-corporation anchors. The route's page.tsx is an async Server Component
// (Prisma fetch), so page.client carries the renderable UI and is exercised
// here. next/link is stubbed to a plain anchor; @jitaspace/ui is a
// pass-through Proxy so CorporationAvatar/Text wrappers don't drop children.
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

const CORPORATIONS = [
  { corporationId: 1000035, name: "Caldari Navy" },
  { corporationId: 1000125, name: "Federation Navy" },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/lp-store/page.client").default;
  const defaults = { corporations: CORPORATIONS };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("LP Store index page (client)", () => {
  it("renders the title, icon and the show-all-offers link", () => {
    renderPage();
    expect(screen.getByText("LP Store")).toBeInTheDocument();
    expect(screen.getByTestId("lp-store-icon")).toBeInTheDocument();

    const allOffers = screen.getByText("show all offers");
    expect(allOffers).toBeInTheDocument();
    expect(allOffers.closest("a")).toHaveAttribute("href", "/lp-store/all");
  });

  it("renders one anchor per corporation with spaces in the name slugified", () => {
    renderPage();
    expect(screen.getByText("Caldari Navy")).toBeInTheDocument();
    expect(screen.getByText("Federation Navy")).toBeInTheDocument();

    // href replaces spaces with underscores: "Caldari Navy" -> "Caldari_Navy".
    expect(
      screen.getByText("Caldari Navy").closest("a"),
    ).toHaveAttribute("href", "/lp-store/Caldari_Navy");
    expect(
      screen.getByText("Federation Navy").closest("a"),
    ).toHaveAttribute("href", "/lp-store/Federation_Navy");
  });

  it("renders with no corporations (empty grid)", () => {
    renderPage({ corporations: [] });
    expect(screen.getByText("LP Store")).toBeInTheDocument();
    expect(screen.queryByText("Caldari Navy")).not.toBeInTheDocument();
  });
});
