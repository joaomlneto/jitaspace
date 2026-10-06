import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

const mockUseSelectedCharacter = jest.fn();
const mockUseAuthStoreHasHydrated = jest.fn();
const mockUseCharacterSkills = jest.fn();
const mockUseCharacterSkillQueue = jest.fn();
const mockUseMarketPrices = jest.fn();
const mockUseEsiAcceptLanguage = jest.fn();
const mockLoginWithEveOnline = jest.fn();
const mockShipTreeView = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useAuthStoreHasHydrated: () => mockUseAuthStoreHasHydrated(),
  useCharacterSkills: (...args: unknown[]) => mockUseCharacterSkills(...args),
  useCharacterSkillQueue: (...args: unknown[]) =>
    mockUseCharacterSkillQueue(...args),
  useMarketPrices: () => mockUseMarketPrices(),
  useEsiAcceptLanguage: () => mockUseEsiAcceptLanguage(),
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

// The real picker is the tree library's, which loads its stylesheet; the
// adapter's own tests cover it. Here it is a radiogroup with the same contract.
jest.mock("../../../packages/ship-tree/ShipTreeFactionSelector", () => {
  const { SHIP_TREE_FACTIONS } = jest.requireActual<{
    SHIP_TREE_FACTIONS: readonly { id: number; name: string }[];
  }>("../../../packages/ship-tree/factions");
  return {
    ShipTreeFactionSelector: ({
      value,
      onChange,
      onHoverChange,
    }: {
      value: number;
      onChange: (id: number) => void;
      onHoverChange?: (id: number | null) => void;
    }) => (
      <div role="radiogroup" aria-label="Faction">
        {SHIP_TREE_FACTIONS.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-label={name}
            aria-checked={id === value}
            onClick={() => onChange(id)}
            onPointerEnter={() => onHoverChange?.(id)}
            onPointerLeave={() => onHoverChange?.(null)}
          />
        ))}
      </div>
    ),
  };
});

const ShipTreePage = require("../app/ship-tree/page.client").default;
const { usePreferencesStore } = require("~/lib/preferences") as {
  usePreferencesStore: {
    setState: (state: { shipTreeDebugMode: boolean }) => void;
  };
};

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
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset().mockReturnValue(null);
    mockUseAuthStoreHasHydrated.mockReset().mockReturnValue(true);
    mockUseCharacterSkills.mockReset().mockReturnValue(skillsQuery());
    mockUseCharacterSkillQueue.mockReset().mockReturnValue({ data: undefined });
    mockUseMarketPrices.mockReset().mockReturnValue({ data: {} });
    mockUseEsiAcceptLanguage.mockReset().mockReturnValue("en");
    usePreferencesStore.setState({ shipTreeDebugMode: false });
    mockLoginWithEveOnline.mockReset();
    mockShipTreeView.mockReset();
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
      expect(screen.getByRole("radio", { name: "Amarr Empire" })).toBeChecked();
      expect(screen.getByText("Faction: Amarr Empire")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Omega clone" })).toBeChecked();
    });

    it("falls back to the defaults for a hand-edited URL", () => {
      renderPage("?faction=not-a-faction&omega=banana");

      expect(lastViewProps().faction).toBe(500001);
      expect(lastViewProps().isOmega).toBe(false);
    });

    it("offers all seventeen factions", () => {
      renderPage();

      const picker = screen.getByRole("radiogroup", { name: "Faction" });
      expect(within(picker).getAllByRole("radio")).toHaveLength(17);
      expect(
        within(picker).getByRole("radio", { name: "Triglavian Collective" }),
      ).toBeInTheDocument();
    });

    it("writes the chosen faction to the URL", async () => {
      const { onUrlUpdate } = renderPage();

      fireEvent.click(screen.getByRole("radio", { name: "Guristas Pirates" }));

      // nuqs batches URL writes, so they land a tick later.
      await waitFor(() =>
        expect(
          onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("faction"),
        ).toBe("guristas"),
      );
      expect(lastViewProps().faction).toBe(500010);
    });

    it("names the chosen faction, and previews the one under the pointer", () => {
      renderPage();

      expect(screen.getByText("Faction: Caldari State")).toBeInTheDocument();
      expect(lastViewProps().summaryFaction).toBe(500001);

      const serpentis = screen.getByRole("radio", { name: "Serpentis" });
      fireEvent.pointerEnter(serpentis);
      expect(screen.getByText("Faction: Serpentis")).toBeInTheDocument();
      expect(lastViewProps().summaryFaction).toBe(500020);
      // Only a preview: the tree stays on the chosen faction.
      expect(lastViewProps().faction).toBe(500001);

      fireEvent.pointerLeave(serpentis);
      expect(screen.getByText("Faction: Caldari State")).toBeInTheDocument();
      expect(lastViewProps().summaryFaction).toBe(500001);
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

    it("invites an anonymous visitor to log in, asking only for the skill scopes", () => {
      renderPage();

      expect(
        screen.getByText("Log in to see which ships you can fly."),
      ).toBeInTheDocument();
      expect(mockUseCharacterSkills).toHaveBeenCalledWith(0);

      fireEvent.click(screen.getByText("log in with eve"));
      expect(mockLoginWithEveOnline).toHaveBeenCalledWith([
        "esi-skills.read_skills.v1",
        "esi-skills.read_skillqueue.v1",
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
        "esi-skills.read_skillqueue.v1",
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
  describe("tooltips", () => {
    const QUEUE_CHARACTER = {
      characterId: CHARACTER.characterId,
      accessTokenPayload: {
        scp: ["esi-skills.read_skills.v1", "esi-skills.read_skillqueue.v1"],
      },
    };

    it("prices ships at ESI's market average, and leaves unpriced ones out", () => {
      mockUseMarketPrices.mockReturnValue({
        data: { 603: { type_id: 603, average_price: 512_345.6 } },
      });

      renderPage();

      const prices = lastViewProps().prices as (id: number) => unknown;
      expect(prices(603)).toBe(512_345.6);
      expect(prices(999_999)).toBeUndefined();
    });

    it("highlights the first queued level the character has not trained yet", () => {
      mockUseSelectedCharacter.mockReturnValue(QUEUE_CHARACTER);
      mockUseCharacterSkills.mockReturnValue(
        skillsQuery({
          hasToken: true,
          data: {
            data: {
              skills: [
                {
                  skill_id: 3330,
                  active_skill_level: 3,
                  trained_skill_level: 3,
                },
              ],
            },
          },
        }),
      );
      // ESI keeps a finished entry at the head until the client syncs.
      mockUseCharacterSkillQueue.mockReturnValue({
        data: {
          data: [
            {
              skill_id: 3330,
              finished_level: 4,
              queue_position: 1,
              finish_date: "2026-10-09T12:00:00Z",
            },
            {
              skill_id: 3330,
              finished_level: 3,
              queue_position: 0,
              finish_date: "2026-10-07T12:00:00Z",
            },
          ],
        },
      });

      renderPage();

      expect(mockUseCharacterSkillQueue).toHaveBeenCalledWith(
        CHARACTER.characterId,
      );
      expect(lastViewProps().training).toEqual({ skillId: 3330, level: 4 });
      expect(
        screen.queryByText("Show the skill in training"),
      ).not.toBeInTheDocument();
    });

    it("highlights nothing without the queue", () => {
      renderPage();

      expect(lastViewProps().training).toBeUndefined();
    });

    it("asks a character with skills but no queue access for it", () => {
      mockUseSelectedCharacter.mockReturnValue(CHARACTER);
      mockUseCharacterSkills.mockReturnValue(
        skillsQuery({ hasToken: true, data: { data: { skills: [SKILL] } } }),
      );

      renderPage();

      fireEvent.click(screen.getByText("Show the skill in training"));
      expect(mockLoginWithEveOnline).toHaveBeenCalledWith([
        "esi-mail.read_mail.v1",
        "esi-skills.read_skillqueue.v1",
      ]);
    });
  });
  describe("locale", () => {
    it("formats tooltip numbers in the language chosen in Settings", () => {
      mockUseEsiAcceptLanguage.mockReturnValue("de");

      renderPage();

      expect(lastViewProps().locale).toBe("de");
    });
  });

  describe("debug mode", () => {
    it("shows no debug options, and leaves the tree's defaults alone, while off", () => {
      renderPage();

      expect(
        screen.queryByRole("region", { name: "Ship Tree debug options" }),
      ).not.toBeInTheDocument();
      expect(lastViewProps().goldenCapsule).toBeUndefined();
      expect(lastViewProps().panZoom).toBeUndefined();
      expect(typeof lastViewProps().prices).toBe("function");
    });

    it("drives the tree's rendering options from the switches above it", () => {
      usePreferencesStore.setState({ shipTreeDebugMode: true });

      renderPage();

      const options = screen.getByRole("region", {
        name: "Ship Tree debug options",
      });
      // Turning it on changes nothing until a switch is flipped.
      expect(lastViewProps().goldenCapsule).toBe(false);
      expect(lastViewProps().strictMode).toBe(false);
      expect(lastViewProps().panZoom).toEqual({
        wheelZoom: true,
        pinchZoom: true,
        pan: true,
      });

      fireEvent.click(
        within(options).getByRole("switch", { name: /Golden capsule/ }),
      );
      expect(lastViewProps().goldenCapsule).toBe(true);

      fireEvent.click(
        within(options).getByRole("switch", { name: /Strict mode/ }),
      );
      expect(lastViewProps().strictMode).toBe(true);

      fireEvent.click(
        within(options).getByRole("switch", { name: /Wheel zoom/ }),
      );
      expect(lastViewProps().panZoom).toEqual({
        wheelZoom: false,
        pinchZoom: true,
        pan: true,
      });

      fireEvent.click(
        within(options).getByRole("switch", { name: /Pan and zoom/ }),
      );
      expect(lastViewProps().panZoom).toBe(false);
      expect(
        within(options).getByRole("switch", { name: /Pinch zoom/ }),
      ).toBeDisabled();

      fireEvent.click(
        within(options).getByRole("switch", { name: /Ship tooltips/ }),
      );
      expect(lastViewProps().shipTooltip).toBe(false);

      fireEvent.click(within(options).getByRole("switch", { name: /^Prices/ }));
      expect(lastViewProps().prices).toBeUndefined();

      fireEvent.click(within(options).getByRole("button", { name: "Reset" }));
      expect(lastViewProps().goldenCapsule).toBe(false);
      expect(lastViewProps().shipTooltip).toBe(true);
      expect(typeof lastViewProps().prices).toBe("function");
    });
  });
});
