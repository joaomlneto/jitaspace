import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

// ---------------------------------------------------------------------------
// DbCollectionsDashboard lists the client-side TanStack-DB collections and the
// live row count of each (via useLiveQuery), and opens a paginated browser
// modal when a collection name is clicked. We mock @tanstack/react-db's
// useLiveQuery to feed deterministic data, and override @jitaspace/hooks to
// expose the `esiNamesCollection` token the dashboard references.
// ---------------------------------------------------------------------------

const mockUseLiveQuery = jest.fn();

jest.mock("@tanstack/react-db", () => ({
  useLiveQuery: (collection: unknown) => mockUseLiveQuery(collection),
}));

jest.mock("@jitaspace/hooks", () => ({
  esiNamesCollection: { __collection: "esi-names" },
}));

function renderDashboard() {
  const {
    DbCollectionsDashboard,
  } = require("~/components/Status/DbCollectionsDashboard");
  return render(
    <MantineProvider>
      <DbCollectionsDashboard />
    </MantineProvider>,
  );
}

describe("DbCollectionsDashboard", () => {
  beforeEach(() => {
    mockUseLiveQuery.mockReset();
  });

  it("renders the dashboard title and the collection name with its row count", () => {
    mockUseLiveQuery.mockReturnValue({
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    renderDashboard();

    expect(screen.getByText("Client-side Database Stores")).toBeInTheDocument();
    expect(screen.getByText("ESI Names")).toBeInTheDocument();
    // count badge -> 3 (toLocaleString)
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows a zero count (gray badge branch) when the collection is empty", () => {
    mockUseLiveQuery.mockReturnValue({ data: [] });
    renderDashboard();
    expect(screen.getByText("ESI Names")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("handles an undefined data result without crashing", () => {
    mockUseLiveQuery.mockReturnValue({ data: undefined });
    renderDashboard();
    expect(screen.getByText("ESI Names")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("opens the collection browser modal and renders item rows when the name is clicked", () => {
    mockUseLiveQuery.mockReturnValue({
      data: [
        { id: 42, name: "Jita" },
        { id: 43, name: "Amarr" },
        "a-plain-string-item",
        { character_id: 99 },
        { nested: { deep: true } },
      ],
    });
    renderDashboard();

    // Click the collection name button to open the browser modal.
    fireEvent.click(screen.getByRole("button", { name: "ESI Names" }));

    // Modal title from CollectionBrowserModal.
    expect(
      screen.getByText("ESI Names Collection Browser"),
    ).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    // "Showing 1-5 of 5 entries" summary line.
    expect(within(dialog).getByText(/Showing 1-5 of 5 entries/)).toBeInTheDocument();

    // Row keys: object with id -> "42"; object with *_id -> "character_id:99";
    // fallback row index for the object lacking id/*_id.
    expect(within(dialog).getByText("42")).toBeInTheDocument();
    expect(within(dialog).getByText("character_id:99")).toBeInTheDocument();

    // Preview for the plain-string item is the string itself.
    expect(within(dialog).getByText("a-plain-string-item")).toBeInTheDocument();
    // Preview for an object is its JSON serialisation.
    expect(within(dialog).getByText('{"id":42,"name":"Jita"}')).toBeInTheDocument();
  });

  it("shows the empty-collection message inside the modal when there are no entries", () => {
    mockUseLiveQuery.mockReturnValue({ data: [] });
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "ESI Names" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "No entries are currently loaded for this collection.",
      ),
    ).toBeInTheDocument();
  });
});
