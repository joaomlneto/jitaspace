import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The Dogma attribute page client is presentational: it receives the attribute
// metadata + the types/groups that use it as props (the route's async Server
// Component fetches them via Prisma). No hooks/useParams are read, so it can be
// rendered directly with realistic props.
// ---------------------------------------------------------------------------

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

// DogmaAttributeValue renders its numeric value; TypeAnchor passes children
// through so type names remain assertable; TypeAvatar is a leaf.
jest.mock("@jitaspace/ui", () => ({
  DogmaAttributeValue: ({ value }: { value?: number }) => (
    <span data-testid="dogma-value">{String(value)}</span>
  ),
  TypeAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
  TypeAvatar: () => <span data-testid="type-avatar" />,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

const TYPES = [
  { typeId: 587, name: "Rifter", value: 100, groupId: 25 },
  { typeId: 588, name: "Breacher", value: 200, groupId: 25 },
  { typeId: 621, name: "Caracal", value: 350, groupId: 26 },
];

const GROUPS = [
  { groupId: 25, name: "Frigate" },
  { groupId: 26, name: "Cruiser" },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/dogma/attribute/[attributeId]/page.client").default;
  const defaults = {
    attributeId: 9,
    title: "Structure Hitpoints",
    name: "hp",
    displayName: "Structure Hitpoints",
    description: "The base structure hitpoints of the item.",
    defaultValue: 1000,
    highIsGood: true,
    published: true,
    stackable: false,
    unit: "HP",
    unitId: 1,
    iconId: 42,
    types: TYPES,
    groups: GROUPS,
  };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("Dogma attribute page (client)", () => {
  it("renders the title, description and every detail field with full data", () => {
    renderPage();

    // "Structure Hitpoints" appears as both the page title and the Display
    // Name detail value.
    expect(
      screen.getAllByText("Structure Hitpoints").length,
    ).toBeGreaterThanOrEqual(2);

    // Description paper -> mail viewer
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "The base structure hitpoints of the item.",
    );

    // Detail labels (uppercased via CSS, text stays original-case in the DOM)
    expect(screen.getByText("Attribute ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("Default Value")).toBeInTheDocument();
    expect(screen.getByText("High is Good")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Stackable")).toBeInTheDocument();
    expect(screen.getByText("Unit")).toBeInTheDocument();
    expect(screen.getByText("Icon ID")).toBeInTheDocument();

    // Boolean badges: High is Good (Yes), Stackable (No)
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(1);

    // Types section grouped by group name, with per-type values.
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Frigate")).toBeInTheDocument();
    expect(screen.getByText("Cruiser")).toBeInTheDocument();
    expect(screen.getByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("Breacher")).toBeInTheDocument();
    expect(screen.getByText("Caracal")).toBeInTheDocument();
    // Per-type DogmaAttributeValue renders the numeric values.
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("falls back to a generated title and omits optional rows when data is null", () => {
    renderPage({
      title: null,
      name: null,
      displayName: null,
      description: null,
      defaultValue: null,
      highIsGood: null,
      published: null,
      stackable: null,
      unit: null,
      unitId: null,
      iconId: null,
      types: [],
      groups: [],
    });

    // Generated title fallback "Attribute {id}".
    expect(screen.getByText("Attribute 9")).toBeInTheDocument();

    // No description block when description is null.
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();

    // Optional rows are skipped.
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Display Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Default Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Unit")).not.toBeInTheDocument();
    expect(screen.queryByText("Icon ID")).not.toBeInTheDocument();

    // Boolean badges show "Unknown" for null values.
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(1);

    // Mandatory rows are still present.
    expect(screen.getByText("Attribute ID")).toBeInTheDocument();
    expect(screen.getByText("High is Good")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
  });
});
