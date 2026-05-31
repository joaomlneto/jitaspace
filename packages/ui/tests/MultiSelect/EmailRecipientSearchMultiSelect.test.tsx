import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// Bypass the debounce so the search value commits immediately.
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

// Stub the ESI-name-resolving leaves used by the underlying EsiSearchMultiSelect.
jest.mock("../../Avatar", () => ({
  EveEntityAvatar: ({ entityId }: { entityId: string | number }) => (
    <img data-testid="entity-avatar" alt={`avatar-${entityId}`} />
  ),
}));

jest.mock("../../Text", () => ({
  EveEntityName: ({ entityId }: { entityId: string | number | null }) => (
    <span data-testid="entity-name" data-entity-id={String(entityId)}>
      {`Entity ${entityId}`}
    </span>
  ),
}));

const {
  EmailRecipientSearchMultiSelect,
} = require("../../MultiSelect/EmailRecipientSearchMultiSelect") as typeof import("../../MultiSelect/EmailRecipientSearchMultiSelect");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const getSearchInput = () => screen.getByRole("textbox");

function emptySearchResult() {
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

describe("EmailRecipientSearchMultiSelect", () => {
  beforeEach(() => {
    mockUseEsiSearch.mockReturnValue(emptySearchResult());
  });

  it("renders a search input", () => {
    renderWithMantine(<EmailRecipientSearchMultiSelect />);
    expect(getSearchInput()).toBeInTheDocument();
  });

  it("searches across character, corporation and alliance categories", () => {
    renderWithMantine(<EmailRecipientSearchMultiSelect />);
    expect(mockUseEsiSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        categories: ["character", "corporation", "alliance"],
      }),
    );
  });

  it("forwards the placeholder prop through to the input", () => {
    renderWithMantine(
      <EmailRecipientSearchMultiSelect placeholder="Add recipients…" />,
    );
    expect(getSearchInput()).toHaveAttribute(
      "placeholder",
      "Add recipients…",
    );
  });

  it("renders externally-controlled values as pills", () => {
    renderWithMantine(
      <EmailRecipientSearchMultiSelect
        value={["111", "222"]}
        onChange={jest.fn()}
      />,
    );
    const ids = screen
      .getAllByTestId("entity-name")
      .map((n) => n.getAttribute("data-entity-id"));
    expect(ids).toEqual(expect.arrayContaining(["111", "222"]));
  });

  it("surfaces search results as selectable options", () => {
    mockUseEsiSearch.mockReturnValue(searchResultWith([987654321]));
    renderWithMantine(<EmailRecipientSearchMultiSelect />);
    expect(
      screen.getByRole("option", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("calls onChange when an option is selected", () => {
    mockUseEsiSearch.mockReturnValue(searchResultWith([987654321]));
    const onChange = jest.fn();
    renderWithMantine(
      <EmailRecipientSearchMultiSelect value={[]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("option", { hidden: true }));
    expect(onChange).toHaveBeenCalledWith(["987654321"]);
  });

  it("disables the input when disabled", () => {
    renderWithMantine(<EmailRecipientSearchMultiSelect disabled />);
    expect(getSearchInput()).toBeDisabled();
  });
});
