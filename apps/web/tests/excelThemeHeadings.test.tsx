import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider, Title } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { themes } from "~/themes";
import { titleVisualLevel } from "~/themes/excel";

// The Excel theme underlines headings like its Heading 1–3 cell styles. Pages
// pick a heading's level for the document outline and its `size` for the look
// (a page title is an h1 drawn at h2 size), so the rules follow the size.
describe("Excel theme headings", () => {
  it("reads the visual level from size, then order", () => {
    expect(titleVisualLevel({ order: 1, size: "h2" })).toBe(2);
    expect(titleVisualLevel({ order: 2, size: "h4" })).toBe(4);
    expect(titleVisualLevel({ order: 3 })).toBe(3);
    expect(titleVisualLevel({ order: 2, size: "xl" })).toBe(2);
    expect(titleVisualLevel({})).toBe(1);
  });

  it("styles an h1 drawn at h2 size as Heading 1", () => {
    render(
      <MantineProvider theme={themes.excel}>
        <Title order={1} size="h2">
          Jita IV - Moon 4
        </Title>
        <Title order={2} size="h4">
          Services
        </Title>
        <Title order={1}>Page</Title>
      </MantineProvider>,
    );
    expect(screen.getByText("Jita IV - Moon 4")).toHaveClass(
      "title",
      "heading2",
    );
    expect(screen.getByText("Services")).toHaveClass("title", "heading4");
    expect(screen.getByText("Services")).not.toHaveClass("heading2");
    expect(screen.getByText("Page")).toHaveClass("title");
    expect(screen.getByText("Page")).not.toHaveClass("heading2");
  });
});
