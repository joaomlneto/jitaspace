import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as PageClientModule from "~/app/mercenary-tactical-operations/page.client";
import type { MercenaryTacticalOperationKind } from "~/components/MercenaryTacticalOperations/operationRows";

const ACTIVITIES = "esi-activities.read_character.v1";
const STRUCTURES = "esi-structures.read_character.v1";

// The page reads everything through hooks; each is driven per test.
const hooks = {
  hasHydrated: jest.fn<() => boolean>(),
  loggedIn: jest.fn<() => number[]>(),
  operations: jest.fn(),
  dens: jest.fn(),
};
let sessions: Record<number, { accessTokenPayload: { scp: string[] } }> = {};

jest.mock("@jitaspace/hooks", () => ({
  MERCENARY_TACTICAL_OPERATIONS_SCOPE: "esi-activities.read_character.v1",
  useAuthStoreHasHydrated: () => hooks.hasHydrated(),
  useAuthenticatedCharacterIds: () => hooks.loggedIn(),
  useAuthStore: (
    selector: (state: { characters: typeof sessions }) => unknown,
  ) => selector({ characters: sessions }),
  useCharactersMercenaryTacticalOperations: () => hooks.operations(),
  useMultipleCharacterStructuresMercenaryDens: () => hooks.dens(),
}));

const mockLogin = jest.fn();
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLogin(...args),
}));

jest.mock("@jitaspace/ui", () => ({
  LoginWithEveOnlineButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Log in with EVE Online
    </button>
  ),
  TimeAgoText: () => null,
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock("~/components/Text", () => ({
  PlanetName: ({ planetId }: { planetId?: number }) => (
    <span>{`planet-${planetId}`}</span>
  ),
}));
jest.mock("~/components/Anchor", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/components/Anchor",
  ),
  EveEntityAnchor: ({ children }: { children?: ReactNode }) => children,
}));

const ALICE = 90000001;
const BOB = 90000002;
const CAROL = 90000003;
const DEN = 1000000000001;
const PLANET = 40000002;

const KINDS: MercenaryTacticalOperationKind[] = [
  {
    dungeonId: 12367,
    name: "Rogue Drone Emergence",
    description: "Destroy all Rogue Drones.",
    anarchyImpact: -20,
    developmentImpact: 10,
    infomorphBonus: 350,
  },
  {
    dungeonId: 12368,
    name: "Drifter Muster",
    description: "Destroy all Drifters.",
    anarchyImpact: -20,
    developmentImpact: 10,
    infomorphBonus: 350,
  },
];

const operation = (
  operationId: string,
  characterIds: number[],
  state: string | null,
  dungeonId = 12367,
) => ({
  operationId,
  mercenaryDenId: DEN,
  characterIds,
  ...(state === null
    ? {}
    : {
        details: {
          id: operationId,
          mercenary_den_id: DEN,
          state,
          dungeon_type_id: dungeonId,
          expires: "2026-11-01T12:00:00Z",
        },
      }),
});

const operationsResult = (over: Record<string, unknown> = {}) => ({
  operations: [],
  characterIds: [],
  unavailableCharacterIds: [],
  pendingCharacterIds: [],
  isLoading: false,
  isPending: false,
  isError: false,
  errors: [],
  refetch: () => undefined,
  ...over,
});

const densResult = (
  data: { subjectId: number; data: unknown }[] = [],
  subjectIds: number[] = [],
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

function renderPage(searchParams = "") {
  const Page = require("~/app/mercenary-tactical-operations/page.client")
    .default as typeof PageClientModule.default;
  return render(
    <MantineProvider>
      <Page kinds={KINDS} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));
const skeletonRows = (container: HTMLElement) =>
  container.querySelectorAll("tr[data-skeleton]");

/** Two characters: Alice offers an available operation, Bob an expired one. */
function withTwoCharacters() {
  hooks.loggedIn.mockReturnValue([ALICE, BOB]);
  hooks.operations.mockReturnValue(
    operationsResult({
      characterIds: [ALICE, BOB],
      operations: [
        operation("a", [ALICE], "Available"),
        operation("b", [BOB], "Expired", 12368),
      ],
    }),
  );
}

describe("Mercenary Tactical Operations page", () => {
  beforeEach(() => {
    // No jest.resetModules(): the page is lazy-required, and a reset registry
    // hands it a second copy of React (see walletPage.test.tsx).
    sessions = {};
    mockLogin.mockReset();
    hooks.hasHydrated.mockReset().mockReturnValue(true);
    hooks.loggedIn.mockReset().mockReturnValue([]);
    hooks.operations.mockReset().mockReturnValue(operationsResult());
    hooks.dens.mockReset().mockReturnValue(densResult());
  });

  it("has a single top-level heading", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Mercenary Tactical Operations",
      }),
    ).toBeInTheDocument();
  });

  it("asks a logged-out visitor to log in, with the scopes the page needs", async () => {
    renderPage();

    // Where the character filter goes, so the table does not move for it.
    expect(
      within(screen.getByRole("group", { name: "Characters" })).getByRole(
        "button",
        { name: "Log in with EVE Online" },
      ),
    ).toBeInTheDocument();
    // Not "no operations", which would claim to know there are none.
    expect(
      screen.getByText("Log in to see your operations."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/has a Mercenary Tactical Operation right now/),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Log in with EVE Online" }),
    );

    expect(mockLogin).toHaveBeenCalledWith([ACTIVITIES, STRUCTURES]);
  });

  it("shows skeleton rows, not the login prompt, before the session loads", () => {
    hooks.hasHydrated.mockReturnValue(false);
    hooks.operations.mockReturnValue(operationsResult({ isPending: true }));

    const { container } = renderPage();

    expect(
      screen.queryByRole("button", { name: "Log in with EVE Online" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Log in to see your operations."),
    ).not.toBeInTheDocument();
    expect(skeletonRows(container).length).toBeGreaterThan(0);
  });

  it("lays out both filter rows before the session loads, so nothing above the table moves", () => {
    // The prerendered HTML is this state: whatever the session turns out to
    // be, the rows are already there and keep their place.
    hooks.hasHydrated.mockReturnValue(false);
    hooks.operations.mockReturnValue(operationsResult({ isPending: true }));

    renderPage();

    expect(
      screen.getByRole("group", { name: "Characters" }),
    ).toBeInTheDocument();
    const status = screen.getByRole("group", { name: "Status" });
    // No counts yet: they would claim there are no operations.
    expect(
      within(status).getByRole("checkbox", { name: "Available" }),
    ).toBeChecked();
    expect(within(status).getAllByRole("checkbox")).toHaveLength(6);
  });

  it("keeps the status filter, without counts, for a logged-out visitor", () => {
    renderPage();

    expect(
      screen.getByRole("checkbox", { name: "In progress" }),
    ).toBeInTheDocument();
  });

  it("holds the counts back while the selected characters load", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        pendingCharacterIds: [ALICE],
        isPending: true,
      }),
    );

    renderPage();

    expect(
      screen.getByRole("checkbox", { name: "Available" }),
    ).toBeInTheDocument();
  });

  it("lists every character's operations, named from the SDE", () => {
    withTwoCharacters();
    renderPage();

    expect(bodyRows()).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Rogue Drone Emergence" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Drifter Muster" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Characters/ }),
    ).toBeInTheDocument();
  });

  it("names a single character instead of offering it as a filter", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [operation("a", [ALICE], "Available")],
      }),
    );
    renderPage();

    expect(
      screen.queryByRole("columnheader", { name: /Characters/ }),
    ).not.toBeInTheDocument();
    const characters = screen.getByRole("group", { name: "Characters" });
    expect(characters).toHaveTextContent(`entity-${ALICE}`);
    expect(within(characters).queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("filters to the characters named in the URL", () => {
    withTwoCharacters();
    renderPage(`?characters=${BOB}`);

    const rows = bodyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Drifter Muster");
    expect(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    ).not.toBeChecked();
  });

  it("filters when a character chip is toggled", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    );

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Drifter Muster");
  });

  it("restores every character once all are selected again", async () => {
    withTwoCharacters();
    renderPage(`?characters=${BOB}`);

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    );

    expect(bodyRows()).toHaveLength(2);
  });

  it("counts the operations in each status", () => {
    withTwoCharacters();
    renderPage();

    const status = screen.getByRole("group", { name: "Status" });
    expect(
      within(status).getByRole("checkbox", { name: "Available (1)" }),
    ).toBeChecked();
    expect(
      within(status).getByRole("checkbox", { name: "Expired (1)" }),
    ).toBeChecked();
    expect(
      within(status).getByRole("checkbox", { name: "In progress (0)" }),
    ).toBeInTheDocument();
  });

  it("counts only the selected characters' operations", () => {
    withTwoCharacters();
    renderPage(`?characters=${ALICE}`);

    expect(
      screen.getByRole("checkbox", { name: "Expired (0)" }),
    ).toBeInTheDocument();
  });

  it("filters to the statuses named in the URL", () => {
    withTwoCharacters();
    renderPage("?states=Expired");

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Drifter Muster");
  });

  it("drops a status in the URL that ESI does not define", () => {
    withTwoCharacters();
    renderPage("?states=Bogus,Expired");

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Drifter Muster");
    expect(
      screen.getByRole("checkbox", { name: "Available (1)" }),
    ).not.toBeChecked();
  });

  it("filters when a status chip is toggled", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Expired (1)" }),
    );

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Rogue Drone Emergence");
  });

  it("says so when every status is deselected", () => {
    withTwoCharacters();
    renderPage("?states=");

    expect(screen.getByText(/Nothing selected/)).toBeInTheDocument();
  });

  it("says so when the filters match nothing", () => {
    withTwoCharacters();
    renderPage("?states=Completed");

    expect(
      screen.getByText("No operations match these filters."),
    ).toBeInTheDocument();
  });

  it("explains an empty list when there are no operations at all", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({ characterIds: [ALICE] }),
    );
    renderPage();

    expect(
      screen.getByText(/has a Mercenary Tactical Operation right now/),
    ).toBeInTheDocument();
  });

  it("offers to sign in again a character that has not granted access", async () => {
    hooks.loggedIn.mockReturnValue([ALICE, CAROL]);
    sessions = {
      [CAROL]: { accessTokenPayload: { scp: ["esi-mail.read_mail.v1"] } },
    };
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        unavailableCharacterIds: [CAROL],
      }),
    );
    renderPage();

    expect(screen.getByText(/One character is not shown/)).toBeInTheDocument();
    // Next to the characters that are shown, where the user looks for it.
    await userEvent.click(
      within(screen.getByRole("group", { name: "Characters" })).getByRole(
        "button",
        { name: `entity-${CAROL} · Log in again` },
      ),
    );

    // Everything Carol already granted, so the new token takes nothing away.
    expect(mockLogin).toHaveBeenCalledWith([
      "esi-mail.read_mail.v1",
      ACTIVITIES,
      STRUCTURES,
    ]);
  });

  it("asks only for the page's scopes for a character with no session", async () => {
    // Requested by id but not logged in, so there is nothing to keep.
    hooks.operations.mockReturnValue(
      operationsResult({ unavailableCharacterIds: [CAROL] }),
    );
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /Log in again/ }));

    expect(mockLogin).toHaveBeenCalledWith([ACTIVITIES, STRUCTURES]);
  });

  it("counts several characters that cannot be shown", () => {
    hooks.loggedIn.mockReturnValue([BOB, CAROL]);
    hooks.operations.mockReturnValue(
      operationsResult({ unavailableCharacterIds: [BOB, CAROL] }),
    );
    renderPage();

    expect(screen.getByText(/2 characters are not shown/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Log in again/ }),
    ).toHaveLength(2);
  });

  it("attributes failures to the character or operation they belong to", () => {
    hooks.loggedIn.mockReturnValue([ALICE, BOB]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE, BOB],
        operations: [operation("c", [ALICE], null)],
        isError: true,
        errors: [
          { characterId: BOB, error: new Error("Service unavailable") },
          { characterId: ALICE, operationId: "c", error: new Error("nope") },
        ],
      }),
    );
    renderPage();

    expect(
      screen.getByText("Some operations could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText(/: Service unavailable/)).toBeInTheDocument();
    expect(
      screen.getByText("The details of one operation could not be loaded."),
    ).toBeInTheDocument();
    // The operation stays listed, marked rather than spinning forever.
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("counts several operations whose details failed", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [
          operation("c", [ALICE], null),
          operation("d", [ALICE], null),
        ],
        isError: true,
        errors: [
          { characterId: ALICE, operationId: "c", error: new Error("x") },
          { characterId: ALICE, operationId: "d", error: new Error("y") },
        ],
      }),
    );
    renderPage();

    expect(
      screen.getByText("The details of 2 operations could not be loaded."),
    ).toBeInTheDocument();
  });

  it("locates each operation's den when its owner shared their structures", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [operation("a", [ALICE], "Available")],
      }),
    );
    hooks.dens.mockReturnValue(
      densResult(
        [
          {
            subjectId: ALICE,
            data: { mercenary_dens: [{ id: DEN, planet_id: PLANET }] },
          },
        ],
        [ALICE],
      ),
    );
    renderPage();

    expect(
      screen.getByRole("link", { name: `planet-${PLANET}` }),
    ).toHaveAttribute("href", `/planet/${PLANET}`);
    expect(
      screen.queryByText(/To see where each Mercenary Den is/),
    ).not.toBeInTheDocument();
  });

  it("offers to grant the structures scope when a character's dens cannot be located", async () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    sessions = { [ALICE]: { accessTokenPayload: { scp: [ACTIVITIES] } } };
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [operation("a", [ALICE], "Available")],
      }),
    );
    renderPage();

    expect(
      screen.getByText(/To see where each Mercenary Den is/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: `entity-${ALICE} · Grant access` }),
    );

    // What Alice already granted, plus the page's scopes.
    expect(mockLogin).toHaveBeenCalledWith([
      ACTIVITIES,
      ACTIVITIES,
      STRUCTURES,
    ]);
  });

  it("holds a placeholder, not Unknown, while a character's dens are loading", () => {
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [operation("a", [ALICE], "Available")],
      }),
    );
    hooks.dens.mockReturnValue(
      densResult([], [ALICE], { isPending: true, pendingSubjectIds: [ALICE] }),
    );
    renderPage();

    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/To see where each Mercenary Den is/),
    ).not.toBeInTheDocument();
  });

  it("ignores a link's character filter when only one character can be shown", () => {
    // A stale link naming Bob, who is not logged in: with no chips to pick
    // Alice again, honouring it would leave the table empty for good.
    hooks.loggedIn.mockReturnValue([ALICE]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE],
        operations: [operation("a", [ALICE], "Available")],
      }),
    );
    renderPage(`?characters=${BOB}`);

    expect(bodyRows()).toHaveLength(1);
    expect(screen.queryByText(/Nothing selected/)).not.toBeInTheDocument();
  });

  it("says no character can be shown, rather than that none has operations", () => {
    hooks.loggedIn.mockReturnValue([CAROL]);
    hooks.operations.mockReturnValue(
      operationsResult({ unavailableCharacterIds: [CAROL] }),
    );
    renderPage();

    expect(
      screen.getByText(/None of your characters can be shown yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/has a Mercenary Tactical Operation right now/),
    ).not.toBeInTheDocument();
  });

  it("is not held in skeleton rows by a deselected character still loading", () => {
    hooks.loggedIn.mockReturnValue([ALICE, BOB]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE, BOB],
        pendingCharacterIds: [BOB],
        isPending: true,
        isLoading: true,
      }),
    );

    const { container } = renderPage(`?characters=${ALICE}`);

    expect(skeletonRows(container)).toHaveLength(0);
    expect(
      screen.getByText(/has a Mercenary Tactical Operation right now/),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows while a selected character is loading", () => {
    hooks.loggedIn.mockReturnValue([ALICE, BOB]);
    hooks.operations.mockReturnValue(
      operationsResult({
        characterIds: [ALICE, BOB],
        pendingCharacterIds: [BOB],
        isPending: true,
        isLoading: true,
      }),
    );

    const { container } = renderPage();

    expect(skeletonRows(container).length).toBeGreaterThan(0);
  });
});
