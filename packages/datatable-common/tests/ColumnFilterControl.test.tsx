import "@testing-library/jest-dom/jest-globals";

import { useState } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  DataTableColumn,
  DataTableColumnFilter,
} from "@jitaspace/datatable";

import type { ColumnFilterValue } from "../filters";
import { ColumnFilterButton } from "../ColumnFilterButton";
import { ColumnFilterControl } from "../ColumnFilterControl";

interface Row {
  name: string;
  level: number;
  active: boolean;
  seen: Date;
}

const rows: Row[] = [
  { name: "Beta", level: 4, active: true, seen: new Date(2024, 0, 2) },
  { name: "Alpha", level: 1, active: false, seen: new Date(2024, 0, 9) },
  { name: "Alpha", level: 2, active: true, seen: new Date(2024, 0, 9) },
];

function column(
  filter: DataTableColumnFilter,
  accessor: keyof Row,
): DataTableColumn<Row> {
  return { id: accessor, header: "Field", accessor, filter };
}

/** Renders the control as an engine would: holding its value in state. */
function renderControl(
  filter: DataTableColumnFilter,
  accessor: keyof Row,
  initial?: ColumnFilterValue,
) {
  const changes: (ColumnFilterValue | undefined)[] = [];
  function Harness() {
    const [value, setValue] = useState<ColumnFilterValue | undefined>(initial);
    return (
      <ColumnFilterControl
        column={column(filter, accessor)}
        rows={rows}
        value={value}
        onChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    );
  }
  // env="test" turns off Mantine's transitions, so a dropdown is visible as
  // soon as it opens.
  render(
    <MantineProvider env="test">
      <Harness />
    </MantineProvider>,
  );
  return changes;
}

describe("ColumnFilterControl", () => {
  it("renders nothing for a column without a filter", () => {
    render(
      <MantineProvider>
        <div data-testid="host">
          <ColumnFilterControl
            column={{ id: "name", header: "Name", accessor: "name" }}
            rows={rows}
            value={undefined}
            onChange={jest.fn()}
          />
        </div>
      </MantineProvider>,
    );
    expect(screen.getByTestId("host")).toBeEmptyDOMElement();
  });

  it("text: emits what is typed, and undefined once emptied", async () => {
    const changes = renderControl({ type: "text" }, "name");
    const input = screen.getByRole("textbox", { name: "Filter Field" });
    await userEvent.type(input, "al");
    expect(changes.at(-1)).toBe("al");
    await userEvent.clear(input);
    expect(changes.at(-1)).toBeUndefined();
  });

  it("select: offers each distinct value once, sorted, and emits the pick", async () => {
    const changes = renderControl({ type: "select" }, "name");
    await userEvent.click(
      screen.getByRole("combobox", { name: "Filter Field" }),
    );
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Alpha", "Beta"]);
    await userEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(changes.at(-1)).toBe("Beta");
  });

  it("select: prefers explicit options over facets", async () => {
    renderControl(
      { type: "select", options: [{ value: "x", label: "Custom X" }] },
      "name",
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "Filter Field" }),
    );
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Custom X",
    ]);
  });

  it("multi-select: accumulates picks into a list", async () => {
    const changes = renderControl({ type: "multi-select" }, "level");
    await userEvent.click(
      screen.getByRole("combobox", { name: "Filter Field" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "1" }));
    await userEvent.click(screen.getByRole("option", { name: "4" }));
    expect(changes.at(-1)).toEqual(["1", "4"]);
  });

  it("range: emits open-ended bounds and shows the data's extremes", () => {
    const changes = renderControl({ type: "range" }, "level");
    const min = screen.getByRole("textbox", { name: "Min" });
    const max = screen.getByRole("textbox", { name: "Max" });
    expect(min).toHaveAttribute("placeholder", "1");
    expect(max).toHaveAttribute("placeholder", "4");
    fireEvent.change(min, { target: { value: "2" } });
    expect(changes.at(-1)).toEqual([2, null]);
    fireEvent.change(max, { target: { value: "3" } });
    expect(changes.at(-1)).toEqual([2, 3]);
  });

  it("boolean: Yes, No, and back to Any", async () => {
    const changes = renderControl({ type: "boolean" }, "active");
    await userEvent.click(screen.getByText("Yes"));
    expect(changes.at(-1)).toBe(true);
    await userEvent.click(screen.getByText("No"));
    expect(changes.at(-1)).toBe(false);
    await userEvent.click(screen.getByText("Any"));
    expect(changes.at(-1)).toBeUndefined();
  });

  it("date-range: opens on the chosen start and emits the picked days", async () => {
    const changes = renderControl({ type: "date-range" }, "seen", [
      "2024-01-02",
      null,
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "9 January 2024" }),
    );
    expect(changes.at(-1)).toEqual(["2024-01-02", "2024-01-09"]);
  });

  it("offers Clear only while the filter is active", async () => {
    const changes = renderControl({ type: "select" }, "name", "Alpha");
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(changes.at(-1)).toBeUndefined();
    expect(
      screen.queryByRole("button", { name: "Clear" }),
    ).not.toBeInTheDocument();
  });
});

describe("ColumnFilterButton", () => {
  it("opens its control in a popover without clicking through to the header", async () => {
    const onHeaderClick = jest.fn();
    render(
      <MantineProvider>
        {/* The header cell's sort handler, as TanStack wires it. */}
        <div onClick={onHeaderClick}>
          <ColumnFilterButton label="Name" active={false}>
            <span>filter body</span>
          </ColumnFilterButton>
        </div>
      </MantineProvider>,
    );
    const button = screen.getByRole("button", { name: "Filter Name" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("filter body")).not.toBeInTheDocument();

    await userEvent.click(button);
    await userEvent.click(await screen.findByText("filter body"));

    expect(onHeaderClick).not.toHaveBeenCalled();
  });

  it("marks an active filter", () => {
    render(
      <MantineProvider>
        <ColumnFilterButton label="Name" active>
          <span />
        </ColumnFilterButton>
      </MantineProvider>,
    );
    expect(screen.getByRole("button", { name: "Filter Name" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
