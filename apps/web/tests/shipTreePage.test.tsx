import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactElement } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

const mockUseSelectedCharacter = jest.fn();
const mockUseAuthStoreHasHydrated = jest.fn();
const mockUseCharacterSkills = jest.fn();
const mockLoginWithEveOnline = jest.fn();
const mockShipTreeView = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useAuthStoreHasHydrated: () => mockUseAuthStoreHasHydrated(),
  useCharacterSkills: (...args: unknown[]) => mockUseCharacterSkills(...args),
}));
jest.mock("@jitaspace/ui", () => ({
  LoginWithEveOnlineButton: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      log in with eve
    </button>
  ),
}));
jest.mock("@jitaspace/eve-components", () => ({
  CharacterName: ({ characterId }: { characterId: number }) => (
    <span>character {characterId}</span>
  ),
}));
jest.mock("@jitaspace/eve-icons", () => ({
  ShipsIcon: () => <svg data-testid="ships-icon" />,
}));
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLoginWithEveOnline(...args),
}));
// The real component draws ~750 SVG sprites from fetched data; its own package
// tests cover that. Here it is a probe for what the page hands it.
jest.mock("../../../packages/ship-tree/ShipTreeView", () => ({
  ShipTreeView: (props: Record<string, unknown>) => {
    mockShipTreeView(props);
    return <div data-testid="ship-tree-view" />;
  },
}));

const ShipTreePage = require("../app/ship-tree/page.client").default;

const SKILL = { skill_id: 3330, active_skill_level: 4 };
const CHARACTER = {
  characterId: 93_000_001,
  accessTokenPayload: { scp: ["esi-mail.read_mail.v1"] },
};

interface SkillsQuery {
  hasToken: boolean;
  data?: { data: { skills: unknown[] } };
  isLoading: boolean;
  isError: boolean;
}
const skillsQuery = (overrides: Partial<SkillsQuery> = {}): SkillsQuery => ({
  hasToken: false,
  data: undefined,
  isLoading: false,
  isError: false,
  ...overrides,
});

function renderPage(searchParams = "") {
  const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
  const NuqsWrapper = withNuqsTestingAdapter({ searchParams, onUrlUpdate });
  const ui: ReactElement = (
    <MantineProvider>
      <ShipTreePage />
    </MantineProvider>
  );
  return { ...render(ui, { wrapper: NuqsWrapper }), onUrlUpdate };
}

const lastViewProps = () =>
  mockShipTreeView.mock.calls.at(-1)?.[0] as Record<string, any>;

describe("/ship-tree page", () => {
  // jsdom has no scrollIntoView, which Mantine's combobox calls on the selected
  // option as it opens.
  const hadScrollIntoView = "scrollIntoView" in Element.prototype;

  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
    mockUseSelectedCharacter.mockReset().mockReturnValue(null);
    mockUseAuthStoreHasHydrated.mockReset().mockReturnValue(true);
    mockUseCharacterSkills.mockReset().mockReturnValue(skillsQuery());
    mockLoginWithEveOnline.mockReset();
    mockShipTreeView.mockReset();
  });

  afterEach(() => {
    if (!hadScrollIntoView) {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  describe("the tree", () => {
    it("opens on Caldari with an alpha tree and no skills", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "Ship Tree" }),
      ).toBeInTheDocument();
      expect(lastViewProps().faction).toBe(500001);
      expect(lastViewProps().isOmega).toBe(false);
      expect(lastViewProps().skills).toBeUndefined();
    });

    it("takes the faction and clone type from the URL", () => {
      renderPage("?faction=amarr&omega=true");

      expect(lastViewProps().faction).toBe(500003);
      expect(lastViewProps().isOmega).toBe(true);
      expect(screen.getByRole("combobox", { name: "Faction" })).toHaveValue(
        "Amarr Empire",
      );
      expect(screen.getByRole("switch", { name: "Omega clone" })).toBeChecked();
    });

    it("falls back to the defaults for a hand-edited URL", () => {
      renderPage("?faction=not-a-faction&omega=banana");

      expect(lastViewProps().faction).toBe(500001);
      expect(lastViewProps().isOmega).toBe(false);
    });

    it("offers all seventeen factions", () => {
      renderPage();

      fireEvent.click(screen.getByRole("combobox", { name: "Faction" }));

      expect(screen.getAllByRole("option")).toHaveLength(17);
      expect(
        screen.getByRole("option", { name: "Triglavian Collective" }),
      ).toBeInTheDocument();
    });

    it("writes the chosen faction to the URL", async () => {
      const { onUrlUpdate } = renderPage();

      fireEvent.click(screen.getByRole("combobox", { name: "Faction" }));
      fireEvent.click(screen.getByRole("option", { name: "Guristas Pirates" }));

      // nuqs batches URL writes, so they land a tick later.
      await waitFor(() =>
        expect(
          onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("faction"),
        ).toBe("guristas"),
      );
      expect(lastViewProps().faction).toBe(500010);
    });

    it("writes the clone type to the URL", async () => {
      const { onUrlUpdate } = renderPage();

      fireEvent.click(screen.getByRole("switch", { name: "Omega clone" }));

      await waitFor(() =>
        expect(
          onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("omega"),
        ).toBe("true"),
      );
      expect(lastViewProps().isOmega).toBe(true);
    });

    it("credits the library and says the data is a snapshot", () => {
      renderPage();

      const link = screen.getByRole("link", {
        name: "@eve-online-tools/eve-ship-tree",
      });
      expect(link).toHaveAttribute(
        "href",
        expect.stringContaining("github.com/eve-online-tools"),
      );
      expect(link).toHaveAttribute("rel", "noreferrer");
      expect(
        screen.getByText(/snapshot of EVE's static data/),
      ).toBeInTheDocument();
    });
  });

  describe("skills", () => {
    it("does not ask for skills until it knows who is logged in", () => {
      mockUseAuthStoreHasHydrated.mockReturnValue(false);

      renderPage();

      expect(screen.queryByText(/Log in to see/)).not.toBeInTheDocument();
      expect(screen.queryByText("log in with eve")).not.toBeInTheDocument();
      expect(screen.getByTestId("ship-tree-view")).toBeInTheDocument();
    });

    it("invites an anonymous visitor to log in, asking only for the skills scope", () => {
      renderPage();

      expect(
        screen.getByText("Log in to see which ships you can fly."),
      ).toBeInTheDocument();
      expect(mockUseCharacterSkills).toHaveBeenCalledWith(0);

      fireEvent.click(screen.getByText("log in with eve"));
      expect(mockLoginWithEveOnline).toHaveBeenCalledWith([
        "esi-skills.read_skills.v1",
      ]);
    });

    it("asks a character without the scope for it, keeping the scopes they already granted", () => {
      mockUseSelectedCharacter.mockReturnValue(CHARACTER);
      mockUseCharacterSkills.mockReturnValue(skillsQuery({ hasToken: false }));

      renderPage();

      expect(
        screen.getByText(
          "Allow access to your skills to see which ships you can fly.",
        ),
      ).toBeInTheDocument();
      expect(lastViewProps().skills).toBeUndefined();

      fireEvent.click(screen.getByText("log in with eve"));
      expect(mockLoginWithEveOnline).toHaveBeenCalledWith([
        "esi-mail.read_mail.v1",
        "esi-skills.read_skills.v1",
      ]);
    });

    it("lights the tree up with the selected character's skills", () => {
      mockUseSelectedCharacter.mockReturnValue(CHARACTER);
      mockUseCharacterSkills.mockReturnValue(
        skillsQuery({ hasToken: true, data: { data: { skills: [SKILL] } } }),
      );

      renderPage();

      expect(mockUseCharacterSkills).toHaveBeenCalledWith(
        CHARACTER.characterId,
      );
      expect(lastViewProps().skills).toEqual([SKILL]);
      expect(screen.getByText(/Showing the skills of/)).toBeInTheDocument();
      expect(screen.getByText("character 93000001")).toBeInTheDocument();
      expect(screen.queryByText("log in with eve")).not.toBeInTheDocument();
    });

    it("says so while the skills load, and still draws the tree", () => {
      mockUseSelectedCharacter.mockReturnValue(CHARACTER);
      mockUseCharacterSkills.mockReturnValue(
        skillsQuery({ hasToken: true, isLoading: true }),
      );

      renderPage();

      expect(screen.getByText(/Loading skills for/)).toBeInTheDocument();
      expect(screen.getByTestId("ship-tree-view")).toBeInTheDocument();
    });

    it("says so when the skills cannot be loaded, and still draws the tree", () => {
      mockUseSelectedCharacter.mockReturnValue(CHARACTER);
      mockUseCharacterSkills.mockReturnValue(
        skillsQuery({ hasToken: true, isError: true }),
      );

      renderPage();

      expect(screen.getByText(/Couldn't load skills for/)).toBeInTheDocument();
      expect(screen.getByTestId("ship-tree-view")).toBeInTheDocument();
    });
  });
});
