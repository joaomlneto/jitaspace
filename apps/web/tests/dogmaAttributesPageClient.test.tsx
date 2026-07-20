import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// apps/web/app/dogma/attributes/page.client.tsx is presentational: it receives
// a Record<number, DogmaAttributeRow> as props (the route's async Server
// Component builds it from Prisma) and renders a MantineReactTable listing every
// attribute. No hooks/params are read, so it renders directly with props.
// ---------------------------------------------------------------------------

// DogmaAttributeAnchor (from @jitaspace/ui) is used inside the Name cell; pass
// its children through so attribute names remain assertable.
jest.mock("@jitaspace/ui", () => ({
  DogmaAttributeAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="attr-anchor">{children}</span>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  AttributesIcon: () => <span data-testid="attributes-icon" />,
}));

const ATTRIBUTES = {
  9: {
    attributeId: 9,
    name: "hp",
    displayName: "Structure Hitpoints",
    numTypeIds: 1234,
  },
  263: {
    attributeId: 263,
    name: "shieldCapacity",
    displayName: "Shield Capacity",
    numTypeIds: 980,
  },
};

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/dogma/attributes/page.client").default;
  return render(
    <MantineProvider>
      <Page attributes={ATTRIBUTES} {...props} />
    </MantineProvider>,
  );
}

describe("Dogma attributes list page (client)", () => {
  it("renders the header and a table row per attribute", () => {
    renderPage();

    // Header
    expect(screen.getByText("Dogma Attributes")).toBeInTheDocument();
    expect(screen.getByTestId("attributes-icon")).toBeInTheDocument();

    // Column headers
    expect(screen.getByText("Attribute ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("# Types")).toBeInTheDocument();

    // Row data: names go through the anchor cell, display names + counts render.
    expect(screen.getByText("hp")).toBeInTheDocument();
    expect(screen.getByText("shieldCapacity")).toBeInTheDocument();
    expect(screen.getByText("Structure Hitpoints")).toBeInTheDocument();
    expect(screen.getByText("Shield Capacity")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("980")).toBeInTheDocument();

    // Name cells route through the mocked DogmaAttributeAnchor.
    expect(screen.getAllByTestId("attr-anchor").length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("renders the table chrome with an empty attribute set", () => {
    renderPage({ attributes: {} });

    expect(screen.getByText("Dogma Attributes")).toBeInTheDocument();
    // Column headers still present with no rows.
    expect(screen.getByText("Attribute ID")).toBeInTheDocument();
    expect(screen.queryByTestId("attr-anchor")).not.toBeInTheDocument();
  });
});
