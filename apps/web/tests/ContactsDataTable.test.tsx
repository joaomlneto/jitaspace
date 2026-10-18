import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  ContactRow,
  ContactSource,
} from "~/components/Contacts/contactRows";

// ContactsDataTable takes ready-made `contacts` rows directly (no internal
// data hook; label names arrive resolved, see contactRows). Rendering the real DataTable executes the module-scope cell renderers
// (name, watched, blocked, standings and labels). @jitaspace/ui supplies
// decorative EveEntity*/Standing children — stub them to no-ops; the
// assertable text (the "watched" Badge, the "Unknown" blocked text, and the
// label Badge) is produced by the cells / Mantine primitives themselves.
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

type Contact = ContactRow;

const CHARACTER_SOURCE = { kind: "character", subjectId: 90000001 } as const;
const CORPORATION_SOURCE = {
  kind: "corporation",
  subjectId: 98000001,
} as const;

const CONTACT_WATCHED = {
  contact_id: 1001,
  contact_type: "character",
  standing: 7.5,
  is_watched: true,
  is_blocked: true, // defined true -> ContactBlockedCell renders "Yes"
  label_ids: [10],
  labelNames: ["Friends"],
  source: CHARACTER_SOURCE,
} satisfies Contact;

const CONTACT_PLAIN = {
  contact_id: 1002,
  contact_type: "corporation",
  standing: -2.5,
  is_watched: false,
  is_blocked: undefined, // undefined -> ContactBlockedCell renders the dimmed "Unknown" text
  label_ids: [],
  labelNames: [],
  source: CHARACTER_SOURCE,
} satisfies Contact;

const CONTACT_NO_LABELS = {
  contact_id: 1003,
  contact_type: "character",
  standing: 0,
  is_watched: false,
  // label_ids omitted entirely — ESI leaves it out for contacts with no labels.
  labelNames: [],
  source: CHARACTER_SOURCE,
} satisfies Contact;

const CONTACT_UNRESOLVED_LABEL = {
  contact_id: 1004,
  contact_type: "character",
  standing: 1,
  is_watched: false,
  is_blocked: false,
  // 10 resolved to "Friends"; 999 was unknown, so its id stands in.
  label_ids: [10, 999],
  labelNames: ["Friends", "999"],
  source: CHARACTER_SOURCE,
} satisfies Contact;

const CORPORATION_CONTACT = {
  contact_id: 1005,
  contact_type: "alliance",
  standing: 5,
  is_watched: false,
  // Corporations have no blocked list, so ESI never sends is_blocked.
  labelNames: [],
  source: CORPORATION_SOURCE,
} satisfies Contact;

const ALLIANCE_SOURCE = { kind: "alliance", subjectId: 99000001 } as const;

function renderTable(
  contacts: Contact[],
  sources: readonly ContactSource[] = [CHARACTER_SOURCE],
  emptyText?: string,
) {
  const {
    ContactsDataTable,
  } = require("~/components/Contacts/ContactsDataTable/ContactsDataTable");
  return render(
    <MantineProvider>
      <ContactsDataTable
        contacts={contacts}
        sources={sources}
        emptyText={emptyText}
      />
    </MantineProvider>,
  );
}

const columnHeader = (name: string) =>
  screen
    .queryAllByRole("columnheader")
    .find((cell) => cell.textContent.startsWith(name));

describe("ContactsDataTable", () => {
  it("renders without crashing for an empty contact list", () => {
    renderTable([]);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders a 'watched' Badge for a watchlisted contact", () => {
    renderTable([CONTACT_WATCHED]);
    // ContactWatchedCell renders <Badge>watched</Badge> when is_watched is true
    expect(screen.getByText("watched")).toBeInTheDocument();
  });

  it("renders a label Badge for each resolved label name", () => {
    renderTable([CONTACT_UNRESOLVED_LABEL]);
    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("renders 'Yes' in the blocked column when is_blocked is true", () => {
    renderTable([CONTACT_WATCHED]);
    // ContactBlockedCell renders "Yes" for a defined truthy is_blocked value
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders the 'Unknown' blocked text when is_blocked is undefined", () => {
    renderTable([CONTACT_PLAIN]);
    // ContactBlockedCell renders the dimmed "Unknown" Text only when is_blocked is undefined
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("leaves the blocked cell empty for a corporation's contact", () => {
    // Only characters have a blocked list; "Unknown" would wrongly suggest
    // ESI could have told us.
    renderTable([CORPORATION_CONTACT], [CHARACTER_SOURCE, CORPORATION_SOURCE]);
    expect(columnHeader("Blocked")).toBeDefined();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    expect(screen.queryByText("No")).not.toBeInTheDocument();
  });

  it("shows the Source column only with more than one source", () => {
    const { unmount } = renderTable([CONTACT_WATCHED]);
    expect(columnHeader("Source")).toBeUndefined();
    unmount();

    renderTable(
      [CONTACT_WATCHED, CORPORATION_CONTACT],
      [CHARACTER_SOURCE, CORPORATION_SOURCE],
    );
    expect(columnHeader("Source")).toBeDefined();
  });

  it("leaves out Blocked without a character source", () => {
    // Corporations have a watchlist but no blocked list.
    renderTable([CORPORATION_CONTACT], [CORPORATION_SOURCE]);
    expect(columnHeader("Blocked")).toBeUndefined();
    expect(columnHeader("Watchlist")).toBeDefined();
  });

  it("leaves out Watchlist and Blocked with only an alliance", () => {
    // Alliances have neither, so both columns would be empty on every row.
    renderTable(
      [{ ...CORPORATION_CONTACT, source: ALLIANCE_SOURCE }],
      [ALLIANCE_SOURCE],
    );
    expect(columnHeader("Watchlist")).toBeUndefined();
    expect(columnHeader("Blocked")).toBeUndefined();
    expect(columnHeader("Standings")).toBeDefined();
  });

  it("shows the empty text it is given", () => {
    renderTable([], [CHARACTER_SOURCE], "No sources selected.");
    expect(screen.getByText("No sources selected.")).toBeInTheDocument();
  });

  it("keeps the same contact from two sources as two distinct rows", () => {
    // The row id must include the source. Keyed by contact id alone, both rows
    // still render (TanStack keeps one row per item), but React sees duplicate
    // keys — which is what this guards against.
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      renderTable(
        [CONTACT_WATCHED, { ...CONTACT_WATCHED, source: CORPORATION_SOURCE }],
        [CHARACTER_SOURCE, CORPORATION_SOURCE],
      );
      const bodyRows = screen
        .getAllByRole("row")
        .filter((r) => r.querySelector("td"));
      expect(bodyRows).toHaveLength(2);
      const duplicateKeyWarnings = consoleError.mock.calls.filter((args) =>
        args.some((arg) => typeof arg === "string" && arg.includes("same key")),
      );
      expect(duplicateKeyWarnings).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("renders without crashing when a contact has no label_ids", () => {
    // Regression guard: ESI omits `label_ids` for contacts with no labels, so
    // the labels cell must optional-chain the `.map()`. The character contacts
    // page crashed client-side when the `?.` was dropped.
    renderTable([CONTACT_NO_LABELS]);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("finds contacts by label name in the search box", async () => {
    renderTable([CONTACT_WATCHED, CONTACT_PLAIN]);
    await userEvent.type(screen.getByPlaceholderText("Search..."), "friends");
    // CONTACT_WATCHED carries the "Friends" label; CONTACT_PLAIN has none.
    expect(screen.getByText("watched")).toBeInTheDocument();
    const bodyRows = screen
      .getAllByRole("row")
      .filter((r) => r.querySelector("td"));
    expect(bodyRows).toHaveLength(1);
  });

  it("lets the Contact column be sorted", () => {
    renderTable([CONTACT_WATCHED, CONTACT_PLAIN]);
    const th = screen
      .getAllByRole("columnheader")
      .find((cell) => cell.textContent.startsWith("Contact"));
    expect(th).toHaveAttribute("aria-sort", "none");
  });

  it("renders multiple rows for multiple contacts", () => {
    renderTable([CONTACT_WATCHED, CONTACT_PLAIN]);
    // Both rows render: the watched badge (row 1) plus a body with >1 data row.
    expect(screen.getByText("watched")).toBeInTheDocument();
    const bodyRows = screen
      .getAllByRole("row")
      // header row has columnheader cells; data rows have gridcell/cell roles
      .filter((r) => r.querySelector("td"));
    expect(bodyRows.length).toBe(2);
  });
});
