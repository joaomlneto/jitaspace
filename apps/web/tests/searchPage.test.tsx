import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// ---------------------------------------------------------------------------
// The page's data layer (useSearchActions) fetches from ESI and debounces
// internally; stub it so these tests only exercise the `?q` URL sync. The
// scope notice is stubbed because it opens a Mantine context modal.
// ---------------------------------------------------------------------------

const mockUseSearchActions = jest.fn();

jest.mock("~/components/Spotlight/useSearchActions", () => ({
  useSearchActions: (query: string) => mockUseSearchActions(query),
}));

jest.mock("~/components/Spotlight/SearchScopeNotice", () => ({
  SearchScopeNotice: () => <div data-testid="scope-notice" />,
}));

function actionsReturn(overrides?: Record<string, unknown>) {
  return {
    filteredActions: [],
    ungrouped: [],
    groups: {},
    canSearchEntities: true,
    ...overrides,
  };
}

function renderPage({
  searchParams = "",
  onUrlUpdate,
}: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction } = {}) {
  const Page = require("~/app/search/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
    {
      wrapper: withNuqsTestingAdapter({
        hasMemory: true,
        searchParams,
        onUrlUpdate,
      }),
    },
  );
}

const searchBox = () => screen.getByRole("textbox", { name: "Search" });

describe("Search page", () => {
  beforeEach(() => {
    mockUseSearchActions.mockReset();
    mockUseSearchActions.mockReturnValue(actionsReturn());
  });

  it("starts empty when the URL has no q param", () => {
    renderPage();
    expect(searchBox()).toHaveValue("");
    expect(mockUseSearchActions).toHaveBeenCalledWith("");
  });

  // The regression this migration fixes: `?q=` used to seed the box but never
  // stay in sync, so a refresh dropped the query.
  it("restores the query from the URL on load", () => {
    renderPage({ searchParams: "?q=jita" });

    expect(searchBox()).toHaveValue("jita");
    expect(mockUseSearchActions).toHaveBeenCalledWith("jita");
  });

  it("writes the typed query to the URL", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage({ onUrlUpdate });

    fireEvent.change(searchBox(), { target: { value: "rifter" } });

    // URL writes are debounced, so this settles asynchronously.
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe("?q=rifter");
  });

  it("keeps the input responsive before the debounced URL write lands", () => {
    renderPage();

    fireEvent.change(searchBox(), { target: { value: "abc" } });

    // nuqs applies the local value synchronously even though the URL write is
    // deferred, so typing must never feel laggy or drop characters.
    expect(searchBox()).toHaveValue("abc");
  });

  // clearOnDefault: emptying the box should strip `q` rather than leave `?q=`.
  it("removes the q param from the URL when the query is cleared", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage({ searchParams: "?q=jita", onUrlUpdate });

    fireEvent.change(searchBox(), { target: { value: "" } });

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe("");
  });

  it("renders matching actions returned for the query", () => {
    mockUseSearchActions.mockReturnValue(
      actionsReturn({
        filteredActions: [{ id: "a", label: "Jita" }],
        ungrouped: [{ id: "a", label: "Jita", onClick: jest.fn() }],
      }),
    );

    renderPage({ searchParams: "?q=jita" });

    expect(screen.getByText("Jita")).toBeInTheDocument();
    expect(screen.queryByText("No results found")).toBeNull();
  });

  it("shows the empty state when nothing matches", () => {
    renderPage({ searchParams: "?q=zzz" });
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("shows the scope notice when entity search is unavailable", () => {
    mockUseSearchActions.mockReturnValue(
      actionsReturn({ canSearchEntities: false }),
    );

    renderPage();

    expect(screen.getByTestId("scope-notice")).toBeInTheDocument();
  });
});
