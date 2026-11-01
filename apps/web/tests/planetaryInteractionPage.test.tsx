import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import {
  CATALOG,
  colony,
  extractor,
  factory,
  HOUR,
  layout,
  NOW,
  pin,
  STORAGE,
  WATER,
  WATER_SCHEMATIC,
} from "./planetaryInteractionFixtures";

// The page lists colonies from one multi-subject hook and opens their layouts
// with another; both are mocked with the envelopes they return.
const mockColonies = jest.fn();
const mockLayouts = jest.fn();
const mockLogin = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  PLANETS_SCOPE: "esi-planets.manage_planets.v1",
  useMultipleCharacterPlanets: () => mockColonies(),
  useCharacterPlanetLayouts: (refs: unknown) => mockLayouts(refs),
  useSelectedCharacter: () => ({
    accessTokenPayload: { scp: ["publicData"] },
  }),
  usePlanet: (planetId: number) => ({
    data: { data: { name: `Planet ${planetId}` } },
  }),
}));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  TypeAvatar: () => null,
  SolarSystemName: ({ solarSystemId }: { solarSystemId?: number }) => (
    <span>{`system-${solarSystemId}`}</span>
  ),
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span>{`type-${typeId}`}</span>
  ),
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock("@jitaspace/ui", () => ({
  PlanetName: ({ name }: { name?: string }) => <span>{name}</span>,
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
// The charts load in the browser only; their summaries are what is tested.
jest.mock("next/dynamic", () => () => () => <div data-testid="chart" />);
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLogin(...args),
}));
let mockNow: number | null = NOW;
jest.mock("~/components/PlanetaryInteraction/useNow", () => ({
  useNow: () => mockNow,
}));

const ALICE = 90000001;
const BOB = 90000002;

const envelope = (
  data: unknown[],
  subjectIds: number[],
  over: Record<string, unknown> = {},
) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  pendingSubjectIds: [],
  refetch: () => undefined,
  ...over,
});

const layouts = (
  data: Record<string, unknown>,
  over: Record<string, unknown> = {},
) => ({
  data,
  errors: [],
  unauthorized: [],
  pendingKeys: [],
  isLoading: false,
  ...over,
});

function renderPage(searchParams = "") {
  const Page = require("~/app/planetary-interaction/page.client").default;
  return render(
    <MantineProvider>
      <Page catalog={CATALOG} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));

/** Alice has an expiring extractor colony; Bob a factory planet with stock. */
function withTwoCharacters() {
  mockColonies.mockReturnValue(
    envelope(
      [colony(ALICE, 40000001), colony(BOB, 40000002, { planet_type: "gas" })],
      [ALICE, BOB],
    ),
  );
  mockLayouts.mockReturnValue(
    layouts({
      [`${ALICE}:40000001`]: layout([
        extractor({ expiresIn: 2 * HOUR }),
        factory(WATER_SCHEMATIC.schematicId),
      ]),
      [`${BOB}:40000002`]: layout([
        factory(WATER_SCHEMATIC.schematicId),
        pin({ type_id: STORAGE, contents: [{ type_id: WATER, amount: 1234 }] }),
      ]),
    }),
  );
}

describe("Planetary Interaction page", () => {
  beforeEach(() => {
    mockNow = NOW;
    mockColonies.mockReset().mockReturnValue(envelope([], []));
    mockLayouts.mockReset().mockReturnValue(layouts({}));
    mockLogin.mockReset();
  });

  it("lists every character's colonies with their status", () => {
    withTwoCharacters();
    renderPage();

    expect(
      screen.getByText("2 colonies across 2 characters"),
    ).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    // Sorted most urgent first.
    expect(rows[0]).toHaveTextContent("Planet 40000001");
    expect(rows[0]).toHaveTextContent("Expiring soon");
    expect(rows[0]).toHaveTextContent("in 2h 0m");
    expect(rows[1]).toHaveTextContent("No extractors");
    expect(
      screen.getByRole("columnheader", { name: /Character/ }),
    ).toBeInTheDocument();
  });

  it("opens the layout of every colony shown", () => {
    withTwoCharacters();
    renderPage();

    expect(mockLayouts).toHaveBeenLastCalledWith([
      { characterId: ALICE, planetId: 40000001 },
      { characterId: BOB, planetId: 40000002 },
    ]);
  });

  it("shows headline numbers", () => {
    withTwoCharacters();
    renderPage();

    const stat = (title: string) =>
      // Paragraphs, so the "Colonies" tab label is not matched too.
      screen.getByText(title, { selector: "p" }).closest(".mantine-Paper-root");
    expect(stat("Colonies")).toHaveTextContent("2");
    expect(stat("Expiring within 24 h")).toHaveTextContent("1");
    expect(stat("Next expiry")).toHaveTextContent("in 2h 0m");
  });

  it("describes its charts for screen readers", () => {
    withTwoCharacters();
    renderPage();

    expect(
      screen.getByRole("img", { name: /Extractor programs: 1 Expiring soon/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /Colonies by planet type: 1 Barren, 1 Gas/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Daily surplus.*Water 1,920/ }),
    ).toBeInTheDocument();
  });

  it("filters to the characters named in the URL, and opens only theirs", () => {
    withTwoCharacters();
    renderPage(`?characters=${BOB}`);

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Planet 40000002");
    expect(mockLayouts).toHaveBeenLastCalledWith([
      { characterId: BOB, planetId: 40000002 },
    ]);
  });

  it("filters when a character chip is toggled", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    );

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Planet 40000002");
  });

  it("says so when no character is selected", () => {
    withTwoCharacters();
    renderPage("?characters=");

    expect(screen.getByText(/No characters selected/)).toBeInTheDocument();
  });

  it("filters by colony status", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Expiring soon" }),
    );

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Planet 40000001");
  });

  it("reads the status filter from the URL", () => {
    withTwoCharacters();
    renderPage("?status=expired");

    expect(
      screen.getByText("No colony matches the selected statuses."),
    ).toBeInTheDocument();
  });

  it("ignores a character selection when there is only one character", () => {
    mockColonies.mockReturnValue(envelope([colony(ALICE, 40000001)], [ALICE]));
    renderPage(`?characters=${BOB}`);

    expect(bodyRows()).toHaveLength(1);
    expect(
      screen.queryByRole("checkbox", { name: `entity-${ALICE}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Character/ }),
    ).not.toBeInTheDocument();
  });

  it("asks for access when no character granted the planets scope", async () => {
    renderPage();

    expect(
      screen.getByText(/Sign in with a character that shares its planets/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with EVE Online" }),
    );
    expect(mockLogin).toHaveBeenCalledWith([
      "publicData",
      "esi-planets.manage_planets.v1",
    ]);
  });

  it("does not ask for access while the characters are still loading", () => {
    mockColonies.mockReturnValue(envelope([], [], { isPending: true }));
    renderPage();

    expect(screen.getByText("Loading your characters…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in with EVE Online" }),
    ).not.toBeInTheDocument();
  });

  it("reports characters and layouts that failed", () => {
    withTwoCharacters();
    mockColonies.mockReturnValue(
      envelope([colony(ALICE, 40000001)], [ALICE, BOB], {
        errors: [{ subjectId: BOB, error: new Error("Forbidden") }],
      }),
    );
    mockLayouts.mockReturnValue(
      layouts(
        {},
        {
          errors: [
            {
              characterId: ALICE,
              planetId: 40000001,
              error: new Error("boom"),
            },
          ],
        },
      ),
    );
    renderPage();

    expect(
      screen.getByText("Some colonies could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument();
    expect(
      screen.getByText(/One colony is listed without its extractors/),
    ).toBeInTheDocument();
    expect(bodyRows()[0]).toHaveTextContent("Unavailable");
  });

  it("waits for the clock before judging expiry", () => {
    withTwoCharacters();
    mockNow = null;
    renderPage();

    expect(bodyRows()[0]).not.toHaveTextContent("Expiring soon");
    expect(screen.getAllByRole("button", { name: "View" })[0]).toBeDisabled();
  });

  it("switches views through the URL", () => {
    withTwoCharacters();
    renderPage("?view=storage");

    expect(screen.getByRole("tab", { name: "Storage" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Water");
    expect(bodyRows()[0]).toHaveTextContent("1,234");
  });

  it("lists extractors by when they run out", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Extractors" }));

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Aqueous Liquids");
    expect(
      screen.getByRole("progressbar", { name: /ends in 2h 0m/ }),
    ).toBeInTheDocument();
  });

  it("nets production across colonies", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Production" }));

    const water = bodyRows().find((row) => row.textContent.includes("Water"));
    // Two Water factories at 40 an hour each.
    expect(water).toHaveTextContent("80");
    expect(water).toHaveTextContent("1,920");
  });

  it("opens a colony's details, and closes them again", async () => {
    withTwoCharacters();
    renderPage();

    const [firstView] = screen.getAllByRole("button", { name: "View" });
    if (!firstView) throw new Error("no View button");
    await userEvent.click(firstView);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Planet 40000001")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("img", { name: /Map of the colony/ }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("table", { name: "Factories" }),
    ).toHaveTextContent("Water");

    await userEvent.keyboard("{Escape}");
    // Still showing the same colony while it animates out.
    expect(screen.queryByText("This colony is not available.")).toBeNull();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("says so when a linked colony is not one of yours", async () => {
    withTwoCharacters();
    renderPage("?colony=1:2");

    expect(
      await screen.findByText("This colony is not available."),
    ).toBeInTheDocument();
  });
});
