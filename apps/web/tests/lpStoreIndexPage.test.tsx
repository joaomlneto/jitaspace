import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

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

// Pinned rather than imported (the page module must load after the mocks):
// renaming the key would silently reset every user's saved toggle.
const ONLY_WITH_LP_STORAGE_KEY = "jitaspace/lp-store-only-with-lp";

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
    window.localStorage.clear();
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

    it("lets the pointer reach the clear button", async () => {
      renderPage();
      fireEvent.change(filter(), { target: { value: "x" } });
      await screen.findByLabelText("Clear filter");
      // Mantine defaults input sections to `pointer-events: none`, which would
      // make a real click fall through to the input (fireEvent cannot see that).
      const wrapper = filter().closest<HTMLElement>(
        "[style*='--input-right-section-pointer-events']",
      );
      expect(
        wrapper?.style.getPropertyValue("--input-right-section-pointer-events"),
      ).toBe("all");
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
      data: { data: [{ corporation_id: 1000035, loyalty_points: 500 }] },
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

  describe("only-with-LP toggle", () => {
    const toggle = () =>
      screen.getByRole("switch", { name: "Only corporations I have LP with" });

    // Signed in with LP at Caldari Navy only.
    const signIn = (overrides: Record<string, unknown> = {}) => {
      mockUseSelectedCharacter.mockReturnValue({ characterId: 90000001 });
      mockUseCharacterLoyaltyPoints.mockReturnValue({
        hasToken: true,
        loyaltyPointsMap: { 1000035: 500 },
        isLoading: false,
        data: { data: [{ corporation_id: 1000035, loyalty_points: 500 }] },
        ...overrides,
      });
    };

    it("is rendered but disabled when signed out, with a hint", async () => {
      // Always rendered, so its row is already in the prerendered page and
      // nothing shifts when the auth store rehydrates.
      renderPage();
      expect(toggle()).toBeDisabled();
      // Exposed to assistive tech, since a disabled input takes no focus...
      expect(toggle()).toHaveAccessibleDescription(
        "Sign in with a character that has granted access to its loyalty points",
      );
      // ...and as a tooltip for pointer and touch users.
      fireEvent.mouseEnter(toggle().closest("div")!.parentElement!);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        /granted access to its loyalty points/,
      );
    });

    it("is drawn off where it cannot take effect, but keeps the preference", () => {
      window.localStorage.setItem(ONLY_WITH_LP_STORAGE_KEY, "true");
      renderPage(); // signed out: the full list, so the switch must not say ON
      expect(toggle()).not.toBeChecked();
      expect(screen.getByText("Federation Navy")).toBeInTheDocument();
      expect(window.localStorage.getItem(ONLY_WITH_LP_STORAGE_KEY)).toBe(
        "true",
      );
    });

    it("can be turned on (and off) while the balances load", async () => {
      signIn({ loyaltyPointsMap: {}, isLoading: true, data: undefined });
      renderPage();
      expect(toggle()).toBeEnabled();
      expect(toggle()).not.toHaveAttribute("aria-describedby");
      fireEvent.click(toggle());
      expect(toggle()).toBeChecked();
      // Held as a skeleton until the balances arrive.
      expect(
        await screen.findByRole("status", {
          name: "Loading your loyalty points",
        }),
      ).toBeInTheDocument();
      fireEvent.click(toggle());
      expect(toggle()).not.toBeChecked();
      expect(screen.getByText("Federation Navy")).toBeInTheDocument();
    });

    it("shows no balances, rather than zeroes, when they failed to load", () => {
      signIn({ loyaltyPointsMap: {}, isError: true, data: undefined });
      renderPage();
      expect(screen.queryByText("0 LP")).toBeNull();
    });

    it("asks for character 0, not any character, when none is selected", () => {
      mockUseSelectedCharacter.mockReturnValue(null);
      renderPage();
      expect(mockUseCharacterLoyaltyPoints).toHaveBeenLastCalledWith(0, {
        enabled: true,
      });
    });

    it("keeps filtering on the last balances when a refetch fails", async () => {
      window.localStorage.setItem(ONLY_WITH_LP_STORAGE_KEY, "true");
      // React Query after a failed background refetch: an error, old data kept.
      signIn({ isSuccess: false, isError: true });
      renderPage();
      await waitFor(() => expect(toggle()).toBeChecked());
      expect(toggle()).toBeEnabled();
      await waitFor(() =>
        expect(screen.queryByText("Federation Navy")).toBeNull(),
      );
      expect(screen.getByText("Caldari Navy")).toBeInTheDocument();
    });

    it("shows everything, toggle off and disabled, if the first request failed", () => {
      window.localStorage.setItem(ONLY_WITH_LP_STORAGE_KEY, "true");
      signIn({ loyaltyPointsMap: {}, isError: true, data: undefined });
      renderPage();
      expect(toggle()).toBeDisabled();
      expect(toggle()).not.toBeChecked();
      expect(toggle()).toHaveAccessibleDescription(
        "Couldn't load your loyalty points",
      );
      expect(screen.getByText("Federation Navy")).toBeInTheDocument();
      expect(screen.getByText("CONCORD")).toBeInTheDocument();
    });

    it("gives no unavailable hint once the balances have loaded", () => {
      signIn();
      renderPage();
      expect(toggle()).toBeEnabled();
      expect(toggle()).not.toHaveAttribute("aria-describedby");
    });

    it("hides corporations without LP, and factions left empty", async () => {
      signIn();
      renderPage();
      expect(toggle()).not.toBeChecked();
      expect(screen.getByText("Federation Navy")).toBeInTheDocument();

      fireEvent.click(toggle());

      expect(toggle()).toBeChecked();
      await waitFor(() =>
        expect(screen.queryByText("Federation Navy")).toBeNull(),
      );
      expect(screen.getByText("Caldari Navy")).toBeInTheDocument();
      expect(screen.queryByText("Gallente Federation")).toBeNull();
      expect(screen.queryByText("Other corporations")).toBeNull();
      expect(screen.queryByText("CONCORD")).toBeNull();
    });

    it("combines with the search, and says so when nothing is left", async () => {
      signIn();
      renderPage();
      fireEvent.click(toggle());
      fireEvent.change(
        screen.getByLabelText("Filter corporations and factions"),
        { target: { value: "gallente" } },
      );
      expect(
        await screen.findByText(/No corporations or factions you have LP with/),
      ).toHaveTextContent(
        "No corporations or factions you have LP with match “gallente”.",
      );
    });

    it("explains an empty list when the character has no LP at all", async () => {
      signIn({ loyaltyPointsMap: {} });
      renderPage();
      fireEvent.click(toggle());
      expect(
        await screen.findByText(
          "You have no loyalty points with any of these corporations yet.",
        ),
      ).toBeInTheDocument();
    });

    it("holds the list as a skeleton while the balances load, if left on", async () => {
      window.localStorage.setItem(ONLY_WITH_LP_STORAGE_KEY, "true");
      signIn({ loyaltyPointsMap: {}, isLoading: true, data: undefined });
      renderPage();
      // A named status region, which assistive tech announces.
      expect(
        await screen.findByRole("status", {
          name: "Loading your loyalty points",
        }),
      ).toHaveAttribute("aria-busy", "true");
      // Not every corporation, only to remove most of them a moment later.
      expect(screen.queryByText("Federation Navy")).toBeNull();
      expect(screen.queryByText("CONCORD")).toBeNull();
    });

    it("shows the full list while the balances load when it is off", () => {
      signIn({ loyaltyPointsMap: {}, isLoading: true, data: undefined });
      renderPage();
      expect(screen.queryByLabelText("Loading your loyalty points")).toBeNull();
      expect(screen.getByText("Federation Navy")).toBeInTheDocument();
    });

    it("does not blame the balances when the store has no corporations", async () => {
      window.localStorage.setItem(ONLY_WITH_LP_STORAGE_KEY, "true");
      signIn({ loyaltyPointsMap: {} });
      renderPage({ groups: [] });
      await waitFor(() => expect(toggle()).toBeChecked());
      expect(
        screen.queryByText(
          "You have no loyalty points with any of these corporations yet.",
        ),
      ).toBeNull();
    });

    it("is remembered across visits", async () => {
      signIn();
      const { unmount } = renderPage();
      fireEvent.click(toggle());
      expect(window.localStorage.getItem(ONLY_WITH_LP_STORAGE_KEY)).toBe(
        "true",
      );
      unmount();

      renderPage();
      await waitFor(() => expect(toggle()).toBeChecked());
      await waitFor(() =>
        expect(screen.queryByText("Federation Navy")).toBeNull(),
      );
    });
  });
});
