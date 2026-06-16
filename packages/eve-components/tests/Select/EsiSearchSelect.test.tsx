import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// EsiSearchSelect pulls search results + name resolution from @jitaspace/hooks
// and renders EveEntityAvatar / EveEntityName for each option. Mock all of
// those so the component body (slicing, name mapping, nothingFound messaging,
// renderOption) executes without real ESI calls.
// ---------------------------------------------------------------------------
const mockUseEsiSearch = jest.fn();
const mockUseEsiNameLookup = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiSearch: (...a: unknown[]) => mockUseEsiSearch(...a),
  useEsiNameLookup: (...a: unknown[]) => mockUseEsiNameLookup(...a),
}));

// useDebouncedValue returns [value] immediately so searchValue ===
// debouncedSearchValue and the search hook runs against current input.
jest.mock("@mantine/hooks", () => {
  const actual =
    jest.requireActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useDebouncedValue: (value: unknown) => [
      value,
      () => {
        /* no-op cancel: the stub resolves synchronously, nothing to cancel */
      },
    ],
  };
});

jest.mock("../../Avatar", () => ({
  EveEntityAvatar: ({ entityId }: { entityId?: string | number }) => (
    <span data-testid="entity-avatar">{`Avatar ${entityId}`}</span>
  ),
}));

jest.mock("../../Text", () => ({
  EveEntityName: ({ entityId }: { entityId?: string | number }) => (
    <span data-testid="entity-name">{`Name ${entityId}`}</span>
  ),
}));

const { EsiSearchSelect } =
  require("../../Select/EsiSearchSelect/EsiSearchSelect") as typeof import("../../Select/EsiSearchSelect/EsiSearchSelect");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

beforeEach(() => {
  mockUseEsiSearch.mockReturnValue({ data: undefined, isLoading: false });
  mockUseEsiNameLookup.mockReturnValue({});
});

describe("EsiSearchSelect", () => {
  it("forwards categories to the search hook and renders the input", () => {
    renderWithMantine(<EsiSearchSelect categories={["character"]} />);
    expect(screen.getByRole("combobox", { hidden: true })).toBeInTheDocument();
    // useEsiSearch(debouncedSearchValue, { categories })
    expect(mockUseEsiSearch).toHaveBeenCalledWith("", {
      categories: ["character"],
    });
  });

  it("prompts for 3+ characters when the search term is too short", async () => {
    renderWithMantine(<EsiSearchSelect categories={["character"]} />);
    await userEvent.click(screen.getByRole("combobox", { hidden: true }));
    expect(
      screen.getByText("Type at least 3 characters to search for results"),
    ).toBeInTheDocument();
  });

  it("shows 'Searching…' and a loader while results are loading", async () => {
    mockUseEsiSearch.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderWithMantine(
      <EsiSearchSelect categories={["character"]} />,
    );
    // Type 3+ chars so the short-search message no longer wins.
    const input = screen.getByRole("combobox", { hidden: true });
    fireEvent.change(input, { target: { value: "jit" } });
    await userEvent.click(input);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    // isLoadingData true -> a Loader is shown in the right section.
    expect(container.querySelector(".mantine-Loader-root")).toBeInTheDocument();
  });

  it("renders resolved entity options from the search results", async () => {
    mockUseEsiSearch.mockReturnValue({
      data: { data: { character: [90000001, 90000002] } },
      isLoading: false,
    });
    mockUseEsiNameLookup.mockReturnValue({
      "90000001": { value: { name: "Pilot One" } },
      "90000002": { value: { name: "Pilot Two" } },
    });

    renderWithMantine(<EsiSearchSelect categories={["character"]} />);
    await userEvent.click(screen.getByRole("combobox", { hidden: true }));

    // One option per searched id; renderOption draws the (mocked) avatar +
    // name + category badge inside each.
    const options = screen.getAllByRole("option", { hidden: true });
    expect(options).toHaveLength(2);
    expect(
      screen.getAllByTestId("entity-avatar").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Name 90000001")).toBeInTheDocument();
    expect(screen.getByText("Name 90000002")).toBeInTheDocument();
    // The category badge is rendered inside the option.
    expect(screen.getAllByText("character").length).toBeGreaterThanOrEqual(1);
    // The data label (from the name-lookup cache) is wired onto the option.
    expect(mockUseEsiNameLookup).toHaveBeenCalledWith([
      { id: 90000001 },
      { id: 90000002 },
    ]);
  });

  it("selecting an option forwards the chosen value to onChange", async () => {
    mockUseEsiSearch.mockReturnValue({
      data: { data: { character: [90000001] } },
      isLoading: false,
    });
    mockUseEsiNameLookup.mockReturnValue({
      "90000001": { value: { name: "Pilot One" } },
    });
    const onChange = jest.fn();

    renderWithMantine(
      <EsiSearchSelect categories={["character"]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("combobox", { hidden: true }));
    await userEvent.click(screen.getAllByRole("option", { hidden: true })[0]!);

    // Internal onChange wrapper runs setValue then forwards to the caller.
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]?.[0]).toBe("90000001");
  });

  it("builds option data with an 'Unknown' label when the name lookup misses", async () => {
    mockUseEsiSearch.mockReturnValue({
      data: { data: { corporation: [98000001] } },
      isLoading: false,
    });
    mockUseEsiNameLookup.mockReturnValue({}); // no resolved name

    renderWithMantine(<EsiSearchSelect categories={["corporation"]} />);
    await userEvent.click(screen.getByRole("combobox", { hidden: true }));
    // A single option is produced for the unresolved id (its data label falls
    // back to "Unknown"); the visible content comes from renderOption.
    expect(screen.getAllByRole("option", { hidden: true })).toHaveLength(1);
    expect(screen.getByText("Name 98000001")).toBeInTheDocument();
    expect(screen.getByText("corporation")).toBeInTheDocument();
  });

  it("shows 'No results found' once a 3+ char search resolves empty", async () => {
    mockUseEsiSearch.mockReturnValue({
      data: { data: {} },
      isLoading: false,
    });
    renderWithMantine(<EsiSearchSelect categories={["character"]} />);
    const input = screen.getByRole("combobox", { hidden: true });
    fireEvent.change(input, { target: { value: "zzz" } });
    await userEvent.click(input);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});
