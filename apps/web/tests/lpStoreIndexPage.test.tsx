import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { captureMock } from "../__mocks__/posthogMocks";

// ---------------------------------------------------------------------------
// The LP Store index page client is presentational: it takes corporations
// grouped by faction and renders a header, an "all offers" link, a filter box,
// and a section of per-corporation anchors per faction. When a character is
// signed in it also shows that character's loyalty-point balance per
// corporation. The route's page.tsx is
// an async Server Component (Prisma fetch), so page.client carries the
// renderable UI and is exercised here. next/link is stubbed to a plain anchor;
// @jitaspace/ui is a pass-through Proxy so CorporationAvatar/Text wrappers
// don't drop children; @jitaspace/hooks is stubbed so we can drive the
// signed-in / loyalty-points state.
// ---------------------------------------------------------------------------

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
  }: {
    children?: React.ReactNode;
    href?: string;
    onClick?: () => void;
  }) => (
    <a href={typeof href === "string" ? href : "#"} onClick={onClick}>
      {children}
    </a>
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

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterLoyaltyPoints = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterLoyaltyPoints: (...args: unknown[]) =>
    mockUseCharacterLoyaltyPoints(...args),
}));

const GROUPS = [
  {
    faction: { factionId: 500001, name: "Caldari State" },
    corporations: [{ corporationId: 1000035, name: "Caldari Navy" }],
  },
  {
    faction: { factionId: 500004, name: "Gallente Federation" },
    corporations: [{ corporationId: 1000120, name: "Federation Navy" }],
  },
  {
    faction: null,
    corporations: [{ corporationId: 1000125, name: "CONCORD" }],
  },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/lp-store/page.client").default;
  const defaults = { groups: GROUPS };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("LP Store index page (client)", () => {
  beforeEach(() => {
    captureMock.mockClear();
    // Default: signed out — no character, no loyalty points.
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseCharacterLoyaltyPoints.mockReturnValue({
      hasToken: false,
      loyaltyPointsMap: {},
      isLoading: false,
    });
  });

  it("captures lp_store_corporation_selected when a corporation is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("Caldari Navy").closest("a")!);

    expect(captureMock).toHaveBeenCalledWith("lp_store_corporation_selected", {
      corporation_id: 1000035,
      corporation_name: "Caldari Navy",
    });
  });

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
    expect(screen.getByText("Caldari Navy").closest("a")).toHaveAttribute(
      "href",
      "/lp-store/Caldari_Navy",
    );
    expect(screen.getByText("Federation Navy").closest("a")).toHaveAttribute(
      "href",
      "/lp-store/Federation_Navy",
    );
  });

  it("renders with no corporations (no groups, no no-match message)", () => {
    renderPage({ groups: [] });
    expect(screen.getByText("LP Store")).toBeInTheDocument();
    expect(screen.queryByText("Caldari Navy")).not.toBeInTheDocument();
    expect(screen.queryByText(/No corporations or factions match/)).toBeNull();
  });

  it("renders a section per faction linking to its page, factionless last", () => {
    renderPage();
    const caldari = screen.getByText("Caldari State");
    expect(caldari.closest("a")).toHaveAttribute("href", "/faction/500001");
    expect(
      screen.getByText("Gallente Federation").closest("a"),
    ).toHaveAttribute("href", "/faction/500004");

    const other = screen.getByText("Other corporations");
    const otherSection = other.closest("section")!;
    expect(within(otherSection).getByText("CONCORD")).toBeInTheDocument();
    expect(within(otherSection).queryByText("Caldari Navy")).toBeNull();

    // Sections keep their order: the factionless group comes last.
    const headings = screen
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Caldari State",
      "Gallente Federation",
      "Other corporations",
    ]);
  });

  describe("filter", () => {
    const filter = () =>
      screen.getByLabelText("Filter corporations and factions");

    it("keeps a whole faction when its name matches", async () => {
      renderPage();
      fireEvent.change(filter(), { target: { value: "gallente" } });
      expect(await screen.findByText("Federation Navy")).toBeInTheDocument();
      expect(screen.queryByText("Caldari Navy")).toBeNull();
      expect(screen.queryByText("CONCORD")).toBeNull();
    });

    it("keeps only matching corporations, case-insensitively", async () => {
      renderPage();
      fireEvent.change(filter(), { target: { value: "CONCORD" } });
      expect(await screen.findByText("Other corporations")).toBeInTheDocument();
      expect(screen.queryByText("Caldari State")).toBeNull();
      expect(screen.queryByText("Federation Navy")).toBeNull();
    });

    it("says so when nothing matches, and the clear button restores the list", async () => {
      renderPage();
      fireEvent.change(filter(), { target: { value: "amarr" } });
      expect(
        await screen.findByText(/No corporations or factions match/),
      ).toHaveTextContent("No corporations or factions match “amarr”.");
      expect(screen.queryByText("Caldari Navy")).toBeNull();

      fireEvent.click(screen.getByLabelText("Clear filter"));
      expect(await screen.findByText("Caldari Navy")).toBeInTheDocument();
      expect(filter()).toHaveValue("");
    });
  });

  it("does not show loyalty points when signed out", () => {
    renderPage();
    expect(screen.queryByText("0 LP")).not.toBeInTheDocument();
    expect(screen.queryByText("500 LP")).not.toBeInTheDocument();
  });

  it("shows the character's loyalty points per corporation when signed in", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 90000001 });
    mockUseCharacterLoyaltyPoints.mockReturnValue({
      hasToken: true,
      loyaltyPointsMap: { 1000035: 500 },
      isLoading: false,
    });

    renderPage();

    // A corporation the character has LP with shows the balance...
    expect(screen.getByText("500 LP")).toBeInTheDocument();
    // ...while corporations with no LP show a zero balance (ESI omits zeroes).
    expect(screen.getAllByText("0 LP")).toHaveLength(2);
  });

  it("shows nothing (not a zero balance) while loyalty points are loading", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 90000001 });
    mockUseCharacterLoyaltyPoints.mockReturnValue({
      hasToken: true,
      loyaltyPointsMap: {},
      isLoading: true,
    });

    renderPage();

    expect(screen.queryByText("0 LP")).not.toBeInTheDocument();
    expect(screen.queryByText("500 LP")).not.toBeInTheDocument();
  });
});
