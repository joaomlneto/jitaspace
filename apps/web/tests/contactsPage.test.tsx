import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// The page merges six multi-subject hooks (contacts and labels for each kind).
// They are argument-less and return a flat, already-tagged list — see
// defineMultiEsiQuery — so the mocks mirror that envelope.
const hooks = {
  characters: jest.fn(),
  characterLabels: jest.fn(),
  corporations: jest.fn(),
  corporationLabels: jest.fn(),
  alliances: jest.fn(),
  allianceLabels: jest.fn(),
};

jest.mock("@jitaspace/hooks", () => ({
  useMultipleCharacterContacts: () => hooks.characters(),
  useMultipleCharacterContactsLabels: () => hooks.characterLabels(),
  useMultipleCorporationContacts: () => hooks.corporations(),
  useMultipleCorporationContactsLabels: () => hooks.corporationLabels(),
  useMultipleAllianceContacts: () => hooks.alliances(),
  useMultipleAllianceContactsLabels: () => hooks.allianceLabels(),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
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
}));

const CHARACTER_ID = 90000001;
const CORPORATION_ID = 98000001;
const ALLIANCE_ID = 99000001;

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

/** Every subject in `subjectIds` still loading, as the hooks report it. */
const loading = (subjectIds: number[]) =>
  envelope([], subjectIds, {
    isPending: true,
    isLoading: true,
    pendingSubjectIds: subjectIds,
  });

const OTHER_CHARACTER_ID = 90000002;

const contact = (
  subjectId: number,
  contactId: number,
  labelIds?: number[],
) => ({
  contact_id: contactId,
  contact_type: "character",
  standing: 5,
  label_ids: labelIds,
  subjectId,
});

function renderPage(searchParams = "") {
  const Page = require("~/app/contacts/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));
const skeletonRows = (container: HTMLElement) =>
  container.querySelectorAll("tr[data-skeleton]");

/** One character, its corporation and its alliance, one contact each. */
function withEverySource() {
  hooks.characters.mockReturnValue(
    envelope([contact(CHARACTER_ID, 1)], [CHARACTER_ID]),
  );
  hooks.corporations.mockReturnValue(
    envelope([contact(CORPORATION_ID, 2)], [CORPORATION_ID]),
  );
  hooks.alliances.mockReturnValue(
    envelope([contact(ALLIANCE_ID, 3)], [ALLIANCE_ID]),
  );
}

describe("Contacts page", () => {
  beforeEach(() => {
    // No jest.resetModules() here: the page is lazy-required, and a reset
    // registry hands it a second copy of React (see walletPage.test.tsx).
    for (const hook of Object.values(hooks)) {
      hook.mockReset();
      hook.mockReturnValue(envelope([], []));
    }
  });

  it("merges every source into one table", () => {
    withEverySource();
    renderPage();

    expect(bodyRows()).toHaveLength(3);
    expect(
      screen.getByRole("columnheader", { name: /Source/ }),
    ).toBeInTheDocument();
  });

  it("filters to the sources named in the URL", () => {
    withEverySource();
    renderPage(`?sources=corporation:${CORPORATION_ID}`);

    const rows = bodyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(`entity-${CORPORATION_ID}`);
  });

  it("filters when a chip is toggled", async () => {
    withEverySource();
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${ALLIANCE_ID}` }),
    );

    expect(bodyRows()).toHaveLength(2);
    expect(
      screen.getByRole("checkbox", { name: `entity-${ALLIANCE_ID}` }),
    ).not.toBeChecked();
  });

  it("says so when no source is selected", () => {
    withEverySource();
    renderPage("?sources=");

    expect(screen.getByText(/No sources selected/)).toBeInTheDocument();
  });

  it("is not held in skeleton rows by a deselected source still loading", () => {
    withEverySource();
    hooks.corporations.mockReturnValue(loading([CORPORATION_ID]));
    hooks.alliances.mockReturnValue(envelope([], [ALLIANCE_ID]));

    const { container } = renderPage(`?sources=alliance:${ALLIANCE_ID}`);

    expect(skeletonRows(container)).toHaveLength(0);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("is not held in skeleton rows by a deselected source of the same kind", () => {
    // Two alts: the selected one has loaded (with no contacts) while the other
    // is still paging. The hook's own isPending is true for both together.
    hooks.characters.mockReturnValue(
      envelope([], [CHARACTER_ID, OTHER_CHARACTER_ID], {
        isPending: true,
        isLoading: true,
        pendingSubjectIds: [OTHER_CHARACTER_ID],
      }),
    );

    const { container } = renderPage(`?sources=character:${CHARACTER_ID}`);

    expect(skeletonRows(container)).toHaveLength(0);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows skeleton rows while a selected source is loading", () => {
    hooks.characters.mockReturnValue(loading([CHARACTER_ID]));

    const { container } = renderPage();

    expect(skeletonRows(container).length).toBeGreaterThan(0);
  });

  it("shows skeleton rows, not an empty state, before the sources are known", () => {
    // The auth store rehydrating: no subjects yet, but every hook pending.
    for (const hook of Object.values(hooks)) {
      hook.mockReturnValue(envelope([], [], { isPending: true }));
    }

    const { container } = renderPage();

    expect(skeletonRows(container).length).toBeGreaterThan(0);
    expect(screen.queryByText("No contacts available")).not.toBeInTheDocument();
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });

  it("ignores a selection naming someone else when only one source exists", () => {
    // A shared link: with a single source there are no chips, so the stale
    // selection must not leave an empty table with no way out.
    hooks.characters.mockReturnValue(
      envelope([contact(CHARACTER_ID, 1)], [CHARACTER_ID]),
    );
    renderPage("?sources=character:1");

    expect(bodyRows()).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("resolves label names per source", () => {
    hooks.characters.mockReturnValue(
      envelope([contact(CHARACTER_ID, 1, [3])], [CHARACTER_ID]),
    );
    hooks.characterLabels.mockReturnValue(
      envelope(
        [{ label_id: 3, label_name: "Friends", subjectId: CHARACTER_ID }],
        [CHARACTER_ID],
      ),
    );
    renderPage();

    expect(screen.getByText("Friends")).toBeInTheDocument();
  });

  it("tells the user how to get access when no source is readable", () => {
    renderPage();
    expect(screen.getByText("No contacts available")).toBeInTheDocument();
  });

  it("names the sources whose contacts or labels failed", () => {
    hooks.characters.mockReturnValue(
      envelope([], [CHARACTER_ID], {
        isError: true,
        errors: [{ subjectId: CHARACTER_ID, error: { message: "boom" } }],
      }),
    );
    hooks.corporationLabels.mockReturnValue(
      envelope([], [CORPORATION_ID], {
        isError: true,
        errors: [{ subjectId: CORPORATION_ID, error: { message: "nope" } }],
      }),
    );
    renderPage();

    expect(
      screen.getByText("Some contacts could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toHaveTextContent(
      `entity-${CHARACTER_ID}: boom`,
    );
    expect(screen.getByText(/nope/)).toHaveTextContent(
      `entity-${CORPORATION_ID} (labels, shown as numbers): nope`,
    );
  });

  it("reports a source once when both its contacts and labels failed", () => {
    // Its contacts are not shown at all, so "labels shown as numbers" would be
    // wrong.
    const failed = (message: string) =>
      envelope([], [CORPORATION_ID], {
        isError: true,
        errors: [{ subjectId: CORPORATION_ID, error: { message } }],
      });
    hooks.corporations.mockReturnValue(failed("contacts down"));
    hooks.corporationLabels.mockReturnValue(failed("labels down"));
    renderPage();

    expect(screen.getByText(/contacts down/)).toBeInTheDocument();
    expect(screen.queryByText(/labels down/)).not.toBeInTheDocument();
  });

  it("titles the alert after labels when only labels failed", () => {
    hooks.characters.mockReturnValue(
      envelope([contact(CHARACTER_ID, 1, [3])], [CHARACTER_ID]),
    );
    hooks.characterLabels.mockReturnValue(
      envelope([], [CHARACTER_ID], {
        isError: true,
        errors: [{ subjectId: CHARACTER_ID, error: { message: "nope" } }],
      }),
    );
    renderPage();

    expect(
      screen.getByText("Some contact labels could not be loaded"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Some contacts could not be loaded"),
    ).not.toBeInTheDocument();
    // The contact still shows, with its label as the bare id.
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
