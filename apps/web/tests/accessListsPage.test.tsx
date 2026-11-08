import "@testing-library/jest-dom/jest-globals";

import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// The page reads everything through useCharactersAccessListDetails, which is
// tested on its own in @jitaspace/hooks; here it is replaced by a fixed
// result so each test can describe exactly what ESI returned.
const mockDetails = jest.fn();
const mockSelectedCharacter = jest.fn();
const mockLogin = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  ACCESS_LISTS_SCOPE: "esi-access.read_lists.v1",
  useCharactersAccessListDetails: () => mockDetails(),
  useSelectedCharacter: () => mockSelectedCharacter(),
  // Names resolve to "Name <id>", so the members table can be searched by
  // name without ESI.
  useEsiNameLookup: (entries: { id: number }[]) =>
    Object.fromEntries(
      entries.map(({ id }) => [
        id.toString(),
        { status: "success", value: { name: `Name ${id}` } },
      ]),
    ),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  // Rendering the id makes "which entity is this" assertable without resolving
  // names over ESI.
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock("~/components/Anchor", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/components/Anchor",
  ),
  EveEntityAnchor: ({ children }: { children?: ReactNode }) => children,
  CharacterAnchor: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLogin(...args),
}));

const ALICE = 90000001;
const BOB = 90000002;

type Access = "Admin" | "Manager" | "Allowed" | "Blocked" | "Unspecified";

const accessList = (
  id: number,
  characterIds: number[],
  {
    name = `List ${id}`,
    description = `About list ${id}`,
    allowEveryone = false,
    characters = characterIds.map((character_id) => ({
      character_id,
      access: "Manager",
    })),
    corporations = [] as { corporation_id: number; access: Access }[],
  } = {},
) => ({
  id,
  name,
  description,
  characterIds,
  membership: {
    allow_everyone: allowEveryone,
    characters,
    corporations,
    alliances: [],
  },
});

const result = (over: Record<string, unknown> = {}) => {
  const data = (over.data ?? []) as ReturnType<typeof accessList>[];
  return {
    data,
    accessLists: data.map((list) => ({
      accessListId: list.id,
      characterIds: list.characterIds,
    })),
    characterIds: [],
    pendingCharacterIds: [],
    pendingAccessListIds: [],
    errors: [],
    detailErrors: [],
    isLoading: false,
    isPending: false,
    isError: false,
    refetch: () => undefined,
    ...over,
  };
};

let urlUpdates: UrlUpdateEvent[] = [];

function renderPage(searchParams = "") {
  const Page = require("~/app/access-lists/page.client").default;
  return render(
    <MantineProvider env="test">
      <Page />
    </MantineProvider>,
    {
      wrapper: withNuqsTestingAdapter({
        searchParams,
        hasMemory: true,
        onUrlUpdate: (event) => urlUpdates.push(event),
      }),
    },
  );
}

const bodyRows = () =>
  screen
    .getAllByRole("row")
    .filter((row) => row.querySelector("td") && !row.closest("[role=dialog]"));
const skeletonRows = (container: HTMLElement) =>
  container.querySelectorAll("tr[data-skeleton]");

/** Alice manages lists 1 and 3, Bob lists 2 and 3. */
function withTwoCharacters() {
  mockDetails.mockReturnValue(
    result({
      characterIds: [ALICE, BOB],
      data: [
        accessList(1, [ALICE]),
        accessList(2, [BOB], { name: "Bob's list" }),
        accessList(3, [ALICE, BOB], {
          characters: [
            { character_id: ALICE, access: "Admin" },
            { character_id: BOB, access: "Manager" },
          ],
        }),
      ],
    }),
  );
}

describe("Access lists page", () => {
  beforeEach(() => {
    // No jest.resetModules() here: the page is lazy-required, and a reset
    // registry hands it a second copy of React (see walletPage.test.tsx).
    mockDetails.mockReset().mockReturnValue(result());
    mockSelectedCharacter.mockReset().mockReturnValue(null);
    mockLogin.mockReset();
    urlUpdates = [];
  });

  it("lists every character's access lists, each once", () => {
    withTwoCharacters();
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Access Lists" }),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
    expect(
      screen.getByRole("columnheader", { name: /Managed by/ }),
    ).toBeInTheDocument();
  });

  it("names the role of each managing character", () => {
    withTwoCharacters();
    renderPage();

    const shared = bodyRows().find((row) =>
      within(row).queryByRole("button", { name: "List 3" }),
    )!;
    expect(within(shared).getByText(`entity-${ALICE}`)).toBeInTheDocument();
    expect(within(shared).getByText("Admin")).toBeInTheDocument();
    expect(within(shared).getByText("Manager")).toBeInTheDocument();
  });

  it("shows only the role column with a single character", () => {
    mockDetails.mockReturnValue(
      result({ characterIds: [ALICE], data: [accessList(1, [ALICE])] }),
    );
    renderPage();

    expect(
      screen.getByRole("columnheader", { name: /Your role/ }),
    ).toBeInTheDocument();
    // Nothing to choose between, so the character is named, not a chip.
    const characters = screen.getByRole("group", { name: "Characters" });
    expect(within(characters).getByText(`entity-${ALICE}`)).toBeInTheDocument();
    expect(within(characters).queryByRole("checkbox")).toBeNull();
  });

  it("filters to the characters named in the URL", () => {
    withTwoCharacters();
    renderPage(`?characters=${BOB}`);

    expect(bodyRows()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "List 1" })).toBeNull();
  });

  it("filters when a character chip is toggled, keeping the URL clean when all are on", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    );
    expect(bodyRows()).toHaveLength(2);
    expect(urlUpdates.at(-1)?.queryString).toBe(`?characters=${BOB}`);

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALICE}` }),
    );
    expect(bodyRows()).toHaveLength(3);
    expect(urlUpdates.at(-1)?.queryString).toBe("");
  });

  it("says so when no character is selected", () => {
    withTwoCharacters();
    renderPage("?characters=");

    expect(screen.getByText(/No characters selected/)).toBeInTheDocument();
  });

  it("searches names and descriptions", async () => {
    withTwoCharacters();
    renderPage();

    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Bob",
    );
    expect(bodyRows()).toHaveLength(1);

    await userEvent.clear(screen.getByRole("textbox", { name: /search/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "About list 3",
    );
    expect(bodyRows()).toHaveLength(1);
  });

  it("opens a list's details from its name, and puts it in the URL", async () => {
    withTwoCharacters();
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE, BOB],
        data: [
          accessList(1, [ALICE], {
            description: "Line one\nLine two",
            corporations: [{ corporation_id: 98000001, access: "Blocked" }],
          }),
        ],
      }),
    );
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "List 1" }));

    const dialog = await screen.findByRole("dialog", { name: "List 1" });
    expect(urlUpdates.at(-1)?.queryString).toBe("?list=1");
    expect(within(dialog).getByText(/Line one/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Members (2)" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Name 98000001")).toBeInTheDocument();
    expect(within(dialog).getByText("Blocked")).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close access list" }),
    );
    expect(urlUpdates.at(-1)?.queryString).toBe("");
  });

  it("searches a list's members by name", async () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE],
        data: [
          accessList(1, [ALICE], {
            corporations: [
              { corporation_id: 98000001, access: "Allowed" },
              { corporation_id: 98000002, access: "Allowed" },
            ],
          }),
        ],
      }),
    );
    renderPage("?list=1");

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: /search/i }),
      "98000002",
    );

    const memberRows = within(dialog)
      .getAllByRole("row")
      .filter((row) => row.querySelector("td"));
    expect(memberRows).toHaveLength(1);
    expect(within(dialog).getByText("Name 98000002")).toBeInTheDocument();
  });

  it("shows a placeholder while a linked list is still loading", async () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE],
        isPending: true,
        accessLists: [{ accessListId: 5, characterIds: [ALICE] }],
        pendingAccessListIds: [5],
      }),
    );
    renderPage("?list=5");

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("status", { name: "Loading access list" }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("Access list not found")).toBeNull();
  });

  it("says when a linked list is not one the characters manage", async () => {
    withTwoCharacters();
    renderPage("?list=999");

    const dialog = await screen.findByRole("dialog", {
      name: "Access list 999",
    });
    expect(
      within(dialog).getByText("Access list not found"),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows while a selected character is loading", () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE, BOB],
        isPending: true,
        pendingCharacterIds: [ALICE],
      }),
    );
    const { container } = renderPage();

    expect(skeletonRows(container).length).toBeGreaterThan(0);
  });

  it("is not held in skeleton rows by a deselected character still loading", () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE, BOB],
        isPending: true,
        pendingCharacterIds: [ALICE],
      }),
    );
    const { container } = renderPage(`?characters=${BOB}`);

    expect(skeletonRows(container)).toHaveLength(0);
    expect(
      screen.getByText("None of your characters manage an access list."),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows, not an empty state, before the characters are known", () => {
    mockDetails.mockReturnValue(result({ isPending: true }));
    const { container } = renderPage();

    expect(skeletonRows(container).length).toBeGreaterThan(0);
    expect(screen.queryByText("No access lists to show")).toBeNull();
    // The characters row is held open, so it does not push the table down
    // when they land.
    expect(
      screen.getByRole("group", { name: "Characters" }),
    ).toBeInTheDocument();
  });

  it("announces the lists still loading once some have landed", () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE],
        isPending: true,
        data: [accessList(1, [ALICE])],
        accessLists: [
          { accessListId: 1, characterIds: [ALICE] },
          { accessListId: 2, characterIds: [ALICE] },
          { accessListId: 3, characterIds: [ALICE] },
        ],
        pendingAccessListIds: [2, 3],
      }),
    );
    renderPage();

    expect(bodyRows()).toHaveLength(1);
    expect(
      screen.getByText("Loading 2 more access lists…"),
    ).toBeInTheDocument();
  });

  it("asks a signed-out visitor to sign in with the scope", async () => {
    renderPage();

    expect(screen.getByText("No access lists to show")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockLogin).toHaveBeenCalledWith(["esi-access.read_lists.v1"]);
  });

  it("asks for the scope on top of the ones already granted", async () => {
    mockSelectedCharacter.mockReturnValue({
      accessTokenPayload: { scp: ["esi-mail.read_mail.v1"] },
    });
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Grant access" }));
    expect(mockLogin).toHaveBeenCalledWith([
      "esi-mail.read_mail.v1",
      "esi-access.read_lists.v1",
    ]);
  });

  it("marks the lists open to everyone, and says so in their details", async () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE],
        data: [
          accessList(1, [ALICE], { allowEveryone: true, description: "" }),
          accessList(2, [ALICE]),
        ],
      }),
    );
    renderPage("?list=1");

    const dialog = await screen.findByRole("dialog", { name: "List 1" });
    expect(
      within(dialog).getByText("Open to everyone not blocked"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("No description.")).toBeInTheDocument();
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getByText("Everyone")).toBeInTheDocument();
    expect(within(table).getByText("Members only")).toBeInTheDocument();
  });

  it("names an unnamed list by its id", () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE],
        data: [accessList(4, [ALICE], { name: "" })],
      }),
    );
    renderPage();

    expect(
      screen.getByRole("button", { name: "Access list 4" }),
    ).toBeInTheDocument();
  });

  it("names the characters and lists that failed to load", () => {
    mockDetails.mockReturnValue(
      result({
        characterIds: [ALICE, BOB],
        data: [accessList(2, [BOB])],
        errors: [{ characterId: ALICE, error: { message: "Forbidden" } }],
        detailErrors: [
          { accessListId: 7, characterId: BOB, error: { message: "Gone" } },
        ],
      }),
    );
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Some access lists could not be loaded");
    expect(alert).toHaveTextContent(
      `entity-${ALICE}'s access lists: Forbidden`,
    );
    expect(alert).toHaveTextContent("Access list 7: Gone");
    expect(bodyRows()).toHaveLength(1);
  });
});

describe("Access lists route", () => {
  it("describes itself, and renders the client page under Suspense", () => {
    jest.isolateModules(() => {
      // A second copy of nuqs in the isolated registry would warn about
      // duplicate adapter contexts; the adapter itself is nuqs's to test.
      jest.doMock("nuqs/adapters/react", () => ({
        NuqsAdapter: ({ children }: { children?: ReactNode }) => children,
      }));
      jest.doMock("~/app/access-lists/page.client", () => ({
        __esModule: true,
        default: () => <p>client page</p>,
      }));
      const route = require("~/app/access-lists/page");
      expect(route.metadata.title).toBe("Access Lists");
      expect(route.metadata.alternates.canonical).toMatch(/\/access-lists$/);

      const Page = route.default;
      render(
        <MantineProvider env="test">
          <Page />
        </MantineProvider>,
      );
    });
    expect(screen.getByText("client page")).toBeInTheDocument();
  });
});
