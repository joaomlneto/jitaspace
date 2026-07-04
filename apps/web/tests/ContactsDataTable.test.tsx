import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ContactsDataTable takes `contacts` / `labels` directly (no internal data
// hook). Rendering the real mantine-react-table executes the module-scope Cell
// renderers (ContactNameCell, ContactWatchedCell, ContactBlockedCell,
// ContactStandingsCell, labels cell). @jitaspace/ui supplies decorative
// EveEntity*/Standing children — stub them to no-ops; the assertable text
// (the "watched" Badge, the "Unknown" blocked text, and the label Badge) is
// produced by the cells / Mantine primitives themselves.
jest.mock(
  "@jitaspace/ui",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

// Cast through unknown — the table reads a subset of the generated contact type.
type Contact = Parameters<
  typeof import("~/components/Contacts/ContactsDataTable/ContactsDataTable")["ContactsDataTable"]
>[0]["contacts"] extends (infer T)[] | undefined
  ? T
  : never;

const CONTACT_WATCHED = {
  contact_id: 1001,
  contact_type: "character",
  standing: 7.5,
  is_watched: true,
  is_blocked: true, // defined true -> ContactBlockedCell renders "Yes"
  label_ids: [10],
} as unknown as Contact;

const CONTACT_PLAIN = {
  contact_id: 1002,
  contact_type: "corporation",
  standing: -2.5,
  is_watched: false,
  is_blocked: undefined, // undefined -> ContactBlockedCell renders the dimmed "Unknown" text
  label_ids: [],
} as unknown as Contact;

const LABELS = [{ label_id: 10, label_name: "Friends" }];

function renderTable(contacts: Contact[]) {
  const {
    ContactsDataTable,
  } = require("~/components/Contacts/ContactsDataTable/ContactsDataTable");
  return render(
    <MantineProvider>
      <ContactsDataTable contacts={contacts} labels={LABELS} />
    </MantineProvider>,
  );
}

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

  it("renders the label Badge using the resolved label name", () => {
    renderTable([CONTACT_WATCHED]);
    // labels cell: labelName[labelId] -> "Friends"
    expect(screen.getByText("Friends")).toBeInTheDocument();
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
