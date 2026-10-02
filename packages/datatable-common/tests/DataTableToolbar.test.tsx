import "@testing-library/jest-dom/jest-globals";

import type { ComponentProps } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTableToolbar } from "../DataTableToolbar";

type Props = ComponentProps<typeof DataTableToolbar>;

function renderToolbar(overrides: Partial<Props> = {}) {
  const props: Props = {
    withGlobalFilter: true,
    globalFilter: "",
    onGlobalFilterChange: jest.fn(),
    withColumnVisibility: true,
    hideableColumns: [
      { id: "a", label: "Alpha", visible: true },
      { id: "b", label: "Beta", visible: false },
    ],
    onToggleColumn: jest.fn(),
    onToggleAllColumns: jest.fn(),
    activeFilterCount: 0,
    onClearFilters: jest.fn(),
    ...overrides,
  };
  const result = render(
    <MantineProvider>
      <DataTableToolbar {...props} />
    </MantineProvider>,
  );
  return { ...result, props };
}

describe("DataTableToolbar", () => {
  it("renders nothing when it has nothing to offer", () => {
    renderToolbar({ withGlobalFilter: false, withColumnVisibility: false });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reports what is typed into the search box", async () => {
    const onGlobalFilterChange = jest.fn();
    renderToolbar({ onGlobalFilterChange });
    await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "x");
    expect(onGlobalFilterChange).toHaveBeenCalledWith("x");
  });

  it("shows Clear filters with the count only while filters are set", async () => {
    const { rerender, props } = renderToolbar();
    expect(
      screen.queryByRole("button", { name: /Clear filters/ }),
    ).not.toBeInTheDocument();

    rerender(
      <MantineProvider>
        <DataTableToolbar {...props} activeFilterCount={2} />
      </MantineProvider>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters (2)" }),
    );
    expect(props.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("still offers Clear filters without a search box or Columns menu", () => {
    renderToolbar({
      withGlobalFilter: false,
      withColumnVisibility: false,
      activeFilterCount: 1,
    });
    expect(
      screen.getByRole("button", { name: "Clear filters (1)" }),
    ).toBeInTheDocument();
  });

  it("lists hideable columns with their visibility and toggles them", async () => {
    const { props } = renderToolbar();
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.getByLabelText("Alpha")).toBeChecked();
    expect(screen.getByLabelText("Beta")).not.toBeChecked();
    // Some but not all visible.
    expect(screen.getByLabelText("Toggle all")).toHaveAttribute(
      "data-indeterminate",
      "true",
    );

    await userEvent.click(screen.getByLabelText("Beta"));
    expect(props.onToggleColumn).toHaveBeenCalledWith("b");
    await userEvent.click(screen.getByLabelText("Toggle all"));
    expect(props.onToggleAllColumns).toHaveBeenCalledTimes(1);
  });
});
