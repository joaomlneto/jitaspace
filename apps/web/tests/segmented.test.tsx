import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { Segmented } from "~/components/Segmented";

const DATA = [
  { value: "rows", label: "Rows" },
  { value: "table", label: "Table" },
] as const;

const renderSegmented = (
  props: Partial<Parameters<typeof Segmented>[0]> = {},
) => {
  const onChange = jest.fn();
  render(
    <MantineProvider>
      <Segmented
        label="View"
        value="rows"
        onChange={onChange}
        data={DATA}
        {...props}
      />
    </MantineProvider>,
  );
  return onChange;
};

describe("Segmented", () => {
  it("is a labelled radio group with the value checked", () => {
    renderSegmented();
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Rows" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Table" })).not.toBeChecked();
  });

  it("reports the picked value", () => {
    const onChange = renderSegmented();
    fireEvent.click(screen.getByText("Table"));
    expect(onChange).toHaveBeenCalledWith("table");
  });

  it("groups its radios under one name, distinct per control", () => {
    render(
      <MantineProvider>
        <Segmented label="A" value="rows" onChange={jest.fn()} data={DATA} />
        <Segmented label="B" value="rows" onChange={jest.fn()} data={DATA} />
      </MantineProvider>,
    );
    const names = screen
      .getAllByRole("radio")
      .map((radio) => radio.getAttribute("name"));
    expect(new Set(names).size).toBe(2);
    expect(names[0]).toBe(names[1]);
  });

  it("can be disabled", () => {
    const onChange = renderSegmented({ disabled: true });
    expect(screen.getByRole("radio", { name: "Table" })).toBeDisabled();
    fireEvent.click(screen.getByText("Table"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders on the server without Math.random()", () => {
    // Mantine's SegmentedControl calls it while rendering, which under
    // cacheComponents drops a prerendered page's content out of its cached
    // HTML. This component exists to avoid that.
    const random = jest.spyOn(Math, "random");
    try {
      const html = renderToString(
        <MantineProvider>
          <Segmented
            label="View"
            value="table"
            onChange={jest.fn()}
            data={DATA}
            size="sm"
          />
        </MantineProvider>,
      );
      expect(html).toContain('data-size="sm"');
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
