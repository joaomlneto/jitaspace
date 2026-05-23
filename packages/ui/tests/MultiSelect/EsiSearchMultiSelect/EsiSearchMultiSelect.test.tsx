import "@testing-library/jest-dom/jest-globals";

import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Bypass debounce so search value is always "committed" immediately in tests
jest.mock("@mantine/hooks", () => {
  const actual =
    jest.requireActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useDebouncedValue: <T,>(value: T) => [value] as [T],
  };
});

const mockUseEsiSearch =
  jest.fn<typeof import("@jitaspace/hooks").useEsiSearch>();

jest.mock("@jitaspace/hooks", () => ({
  useEsiSearch: (...args: unknown[]) =>
    mockUseEsiSearch(
      ...(args as Parameters<typeof import("@jitaspace/hooks").useEsiSearch>),
    ),
}));

// Lightweight stand-ins so we don't pull in the full ESI name-resolution machinery
jest.mock("../../../Avatar", () => ({
  EveEntityAvatar: ({ entityId }: { entityId: string | number }) => (
    <img
      data-testid="entity-avatar"
      data-entity-id={String(entityId)}
      alt={`avatar-${entityId}`}
    />
  ),
}));

jest.mock("../../../Text", () => ({
  EveEntityName: ({ entityId }: { entityId: string | number | null }) => (
    <span data-testid="entity-name" data-entity-id={String(entityId)}>
      {`Entity ${entityId}`}
    </span>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

/** Returns the hidden text input inside PillsInput.Field */
function getSearchInput() {
  return screen.getByRole("textbox");
}

function defaultSearchResult() {
  return { data: undefined, isLoading: false } as ReturnType<
    typeof import("@jitaspace/hooks").useEsiSearch
  >;
}

function searchResultWith(ids: number[], category = "character") {
  return {
    data: { data: { [category]: ids } },
    isLoading: false,
  } as unknown as ReturnType<typeof import("@jitaspace/hooks").useEsiSearch>;
}

// ---------------------------------------------------------------------------
// Import component (after mocks are set up)
// ---------------------------------------------------------------------------

const { EsiSearchMultiSelect } =
  require("../../../MultiSelect/EsiSearchMultiSelect/EsiSearchMultiSelect") as typeof import("../../../MultiSelect/EsiSearchMultiSelect/EsiSearchMultiSelect");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EsiSearchMultiSelect", () => {
  beforeEach(() => {
    mockUseEsiSearch.mockReturnValue(defaultSearchResult());
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe("rendering", () => {
    it("renders without crashing", () => {
      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      expect(getSearchInput()).toBeInTheDocument();
    });

    it("renders the label when provided", () => {
      renderWithMantine(
        <EsiSearchMultiSelect categories={["character"]} label="Recipients" />,
      );
      expect(screen.getByText("Recipients")).toBeInTheDocument();
    });

    it("renders the placeholder when no values are selected", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          placeholder="Search characters…"
        />,
      );
      expect(getSearchInput()).toHaveAttribute(
        "placeholder",
        "Search characters…",
      );
    });

    it("hides the placeholder when values are present", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["123456"]}
          onChange={jest.fn()}
          placeholder="Search characters…"
        />,
      );
      expect(getSearchInput()).not.toHaveAttribute("placeholder");
    });

    it("renders existing selected values as pills", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111", "222"]}
          onChange={jest.fn()}
        />,
      );
      const names = screen.getAllByTestId("entity-name");
      const ids = names.map((n) => n.getAttribute("data-entity-id"));
      expect(ids).toContain("111");
      expect(ids).toContain("222");
    });

    it("renders avatars for existing selected values", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111"]}
          onChange={jest.fn()}
        />,
      );
      const avatar = screen.getByTestId("entity-avatar");
      expect(avatar).toHaveAttribute("data-entity-id", "111");
    });
  });

  // -------------------------------------------------------------------------
  // Search prompts and loading states
  // -------------------------------------------------------------------------

  describe("search messaging", () => {
    it("shows a prompt to type at least 3 characters when the input is focused with no query", async () => {
      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      await userEvent.click(getSearchInput());
      expect(
        await screen.findByText(
          "Type at least 3 characters to search for results",
        ),
      ).toBeInTheDocument();
    });

    it("shows a searching indicator while the ESI query is loading", async () => {
      mockUseEsiSearch.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof import("@jitaspace/hooks").useEsiSearch>);

      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      const input = getSearchInput();
      await userEvent.click(input);
      await userEvent.type(input, "jita");

      expect(await screen.findByText("Searching…")).toBeInTheDocument();
    });

    it("shows 'No results found' when ESI returns an empty result", async () => {
      mockUseEsiSearch.mockReturnValue(searchResultWith([]));

      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      const input = getSearchInput();
      await userEvent.click(input);
      await userEvent.type(input, "xyz");

      expect(await screen.findByText("No results found")).toBeInTheDocument();
    });

    it("passes the current search value to useEsiSearch", async () => {
      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      await userEvent.type(getSearchInput(), "jita");

      expect(mockUseEsiSearch).toHaveBeenCalledWith(
        "jita",
        expect.objectContaining({ categories: ["character"] }),
      );
    });

    it("passes the provided categories to useEsiSearch", () => {
      renderWithMantine(
        <EsiSearchMultiSelect categories={["character", "corporation"]} />,
      );
      expect(mockUseEsiSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ categories: ["character", "corporation"] }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Dropdown options
  // -------------------------------------------------------------------------

  describe("dropdown options", () => {
    it("displays search results as selectable options", async () => {
      mockUseEsiSearch.mockReturnValue(searchResultWith([123456789]));

      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      const input = getSearchInput();
      await userEvent.click(input);
      await userEvent.type(input, "jita");

      // The option renders an EveEntityName with the ID
      expect(await screen.findByTestId("entity-name")).toHaveAttribute(
        "data-entity-id",
        "123456789",
      );
    });

    it("renders a category badge for each option", async () => {
      mockUseEsiSearch.mockReturnValue(
        searchResultWith([123456789], "corporation"),
      );

      renderWithMantine(<EsiSearchMultiSelect categories={["corporation"]} />);
      await userEvent.click(getSearchInput());
      await userEvent.type(getSearchInput(), "test");

      expect(await screen.findByText("corporation")).toBeInTheDocument();
    });

    it("does not include already-selected IDs among the options", async () => {
      const id = 123456789;
      mockUseEsiSearch.mockReturnValue(searchResultWith([id]));

      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={[String(id)]}
          onChange={jest.fn()}
        />,
      );
      await userEvent.click(getSearchInput());
      await userEvent.type(getSearchInput(), "jita");

      // The entity-name for the option should NOT appear (the pill still shows
      // one entity-name for the already-selected value)
      const names = screen.getAllByTestId("entity-name");
      // Only the pill's name, not a duplicate in the dropdown
      expect(names).toHaveLength(1);
      expect(names[0]).toHaveAttribute("data-entity-id", String(id));
    });
  });

  // -------------------------------------------------------------------------
  // Selecting options (uncontrolled)
  // -------------------------------------------------------------------------

  describe("uncontrolled selection", () => {
    it("adds a selected option to the pill list", async () => {
      mockUseEsiSearch.mockReturnValue(searchResultWith([123456789]));

      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);

      // The Combobox portal renders with display:none in jsdom (floating-ui
      // can't compute positions). Options are in the DOM — find via hidden:true
      // and dispatch a click directly.
      const option = screen.getByRole("option", { hidden: true });
      fireEvent.click(option);

      const names = screen.getAllByTestId("entity-name");
      expect(
        names.some((n) => n.getAttribute("data-entity-id") === "123456789"),
      ).toBe(true);
    });

    it("clears the search field after selecting an option", async () => {
      mockUseEsiSearch.mockReturnValue(searchResultWith([123456789]));

      renderWithMantine(<EsiSearchMultiSelect categories={["character"]} />);
      const option = screen.getByRole("option", { hidden: true });
      fireEvent.click(option);

      expect(getSearchInput()).toHaveValue("");
    });
  });

  // -------------------------------------------------------------------------
  // Selecting options (controlled)
  // -------------------------------------------------------------------------

  describe("controlled selection", () => {
    it("calls onChange with the new value when an option is selected", () => {
      mockUseEsiSearch.mockReturnValue(searchResultWith([123456789]));
      const onChange = jest.fn();

      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={[]}
          onChange={onChange}
        />,
      );
      const option = screen.getByRole("option", { hidden: true });
      fireEvent.click(option);

      expect(onChange).toHaveBeenCalledWith(["123456789"]);
    });

    it("reflects the externally-controlled value as pills", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["999888777"]}
          onChange={jest.fn()}
        />,
      );
      expect(screen.getByTestId("entity-name")).toHaveAttribute(
        "data-entity-id",
        "999888777",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Removing pills
  // -------------------------------------------------------------------------

  describe("removing values", () => {
    it("calls onChange with the value removed when the remove button is clicked", () => {
      const onChange = jest.fn();
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111", "222"]}
          onChange={onChange}
        />,
      );

      // Mantine's Pill remove button has aria-hidden="true".
      // Use { hidden: true } to locate it; onRemove fires via onClick (not onMouseDown).
      const removeButtons = screen.getAllByRole("button", { hidden: true });
      fireEvent.click(removeButtons[0]!);

      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/^(111|222)$/)]),
      );
      // Should have one fewer item than the original two
      expect((onChange.mock.calls[0] as [string[]])[0]).toHaveLength(1);
    });

    it("removes the last pill when Backspace is pressed in an empty search field", async () => {
      const onChange = jest.fn();
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111", "222"]}
          onChange={onChange}
        />,
      );

      const input = getSearchInput();
      await userEvent.click(input);
      // Input is empty at this point; Backspace should remove last pill ("222")
      fireEvent.keyDown(input, { key: "Backspace" });

      expect(onChange).toHaveBeenCalledWith(["111"]);
    });

    it("does NOT remove a pill on Backspace when the search field has text", async () => {
      const onChange = jest.fn();
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111"]}
          onChange={onChange}
        />,
      );

      const input = getSearchInput();
      await userEvent.click(input);
      await userEvent.type(input, "j");
      fireEvent.keyDown(input, { key: "Backspace" });

      // Backspace with text just deletes the character, should not touch pills
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // defaultValue (uncontrolled initial state)
  // -------------------------------------------------------------------------

  describe("defaultValue", () => {
    it("pre-populates pills from defaultValue", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          defaultValue={["555666"]}
        />,
      );
      expect(screen.getByTestId("entity-name")).toHaveAttribute(
        "data-entity-id",
        "555666",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------

  describe("disabled state", () => {
    it("disables the search input", () => {
      renderWithMantine(
        <EsiSearchMultiSelect categories={["character"]} disabled />,
      );
      expect(getSearchInput()).toBeDisabled();
    });

    it("hides the remove button on pills when disabled", () => {
      renderWithMantine(
        <EsiSearchMultiSelect
          categories={["character"]}
          value={["111"]}
          onChange={jest.fn()}
          disabled
        />,
      );
      // Disabled pills don't render a remove button
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
