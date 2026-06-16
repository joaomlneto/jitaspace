import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ContactsTable is a plain Mantine <Table> (not mantine-react-table). It maps
// `contacts` to rows inline. @jitaspace/ui supplies decorative
// EveEntity*/Standing children — stub them to no-ops; the assertable text (the
// "watched" Badge, the resolved label name, and the blocked cell text) comes
// from the row-mapping logic itself.
jest.mock(
  "@jitaspace/ui",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

type Contact = NonNullable<
  Parameters<
    typeof import("~/components/Contacts/ContactsTable/ContactsTable")["ContactsTable"]
  >[0]["contacts"]
>[number];
type Label = NonNullable<
  Parameters<
    typeof import("~/components/Contacts/ContactsTable/ContactsTable")["ContactsTable"]
  >[0]["labels"]
>[number];

const CONTACT_HIGH = {
  contact_id: 2001,
  contact_type: "character",
  standing: 10,
  is_watched: true,
  is_blocked: false, // defined -> blocked cell renders "No"
  label_ids: [20],
} as unknown as Contact;

const CONTACT_LOW = {
  contact_id: 2002,
  contact_type: "alliance",
  standing: -10,
  is_watched: false,
  is_blocked: undefined, // undefined -> blocked cell renders italic "Unknown"
  label_ids: [],
} as unknown as Contact;

const LABELS = [{ label_id: 20, label_name: "Allies" }] as unknown as Label[];

function renderTable(contacts: Contact[], hideBlockedColumn = false) {
  const {
    ContactsTable,
  } = require("~/components/Contacts/ContactsTable/ContactsTable");
  return render(
    <MantineProvider>
      <ContactsTable
        contacts={contacts}
        labels={LABELS}
        hideBlockedColumn={hideBlockedColumn}
      />
    </MantineProvider>,
  );
}

describe("ContactsTable", () => {
  it("renders the header row without crashing for no contacts", () => {
    renderTable([]);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Standing")).toBeInTheDocument();
    expect(screen.getByText("Blocked?")).toBeInTheDocument();
  });

  it("renders a 'watched' Badge for a watchlisted contact", () => {
    renderTable([CONTACT_HIGH]);
    expect(screen.getByText("watched")).toBeInTheDocument();
  });

  it("renders the resolved label name", () => {
    renderTable([CONTACT_HIGH]);
    // labels?.find(l => l.label_id === labelId)?.label_name -> "Allies"
    expect(screen.getByText("Allies")).toBeInTheDocument();
  });

  it("renders 'No' for a contact whose is_blocked is false", () => {
    renderTable([CONTACT_HIGH]);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders italic 'Unknown' for a contact whose is_blocked is undefined", () => {
    renderTable([CONTACT_LOW]);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders both contacts (sorted by standing desc) as data rows", () => {
    renderTable([CONTACT_LOW, CONTACT_HIGH]);
    const bodyRows = screen
      .getAllByRole("row")
      .filter((r) => r.querySelector("td"));
    expect(bodyRows.length).toBe(2);
  });

  it("omits the Blocked column when hideBlockedColumn is set", () => {
    renderTable([CONTACT_HIGH], true);
    expect(screen.queryByText("Blocked?")).not.toBeInTheDocument();
  });
});
