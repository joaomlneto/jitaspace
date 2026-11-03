import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { Checkbox, MantineProvider, Pagination } from "@mantine/core";
import { render } from "@testing-library/react";

import { themes } from "~/themes";

// Mantine's getContrastColor reads the light scheme's shade alone, so these
// components put white on the dark scheme's light teal. The EVE theme gives
// them a text colour per scheme instead.
const PER_SCHEME =
  "light-dark(var(--mantine-color-white), var(--mantine-color-black))";

const renderIn = (ui: React.ReactElement) =>
  render(
    <MantineProvider theme={themes.eve} defaultColorScheme="dark">
      {ui}
    </MantineProvider>,
  );

describe("EVE theme text on filled components", () => {
  it("gives the active page of a Pagination per-scheme text", () => {
    const { container } = renderIn(<Pagination total={3} value={1} />);
    const root = container.querySelector<HTMLElement>(
      ".mantine-Pagination-root",
    );
    expect(root?.style.getPropertyValue("--pagination-active-color")).toBe(
      PER_SCHEME,
    );
  });

  it("gives a Checkbox's tick per-scheme text", () => {
    const { container } = renderIn(<Checkbox defaultChecked label="Tick" />);
    const root = container.querySelector<HTMLElement>(".mantine-Checkbox-root");
    expect(root?.style.getPropertyValue("--checkbox-icon-color")).toBe(
      PER_SCHEME,
    );
  });

  it("leaves an explicit iconColor alone", () => {
    const { container } = renderIn(
      <Checkbox defaultChecked iconColor="red" label="Tick" />,
    );
    const root = container.querySelector<HTMLElement>(".mantine-Checkbox-root");
    expect(root?.style.getPropertyValue("--checkbox-icon-color")).toBe(
      "var(--mantine-color-red-filled)",
    );
  });

  it("leaves a component with autoContrast off alone", () => {
    const { container } = renderIn(
      <Pagination total={3} value={1} autoContrast={false} />,
    );
    const root = container.querySelector<HTMLElement>(
      ".mantine-Pagination-root",
    );
    expect(root?.style.getPropertyValue("--pagination-active-color")).toBe("");
  });
});
