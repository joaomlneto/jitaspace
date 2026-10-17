import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { OpenInformationWindowAnchor } from "../../Anchor/OpenInformationWindowAnchor";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("OpenInformationWindowAnchor", () => {
  it("invokes onOpen when clicked and enabled", () => {
    const onOpen = jest.fn();
    renderWithMantine(
      <OpenInformationWindowAnchor onOpen={onOpen}>
        Open
      </OpenInformationWindowAnchor>,
    );
    screen.getByText("Open").click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onOpen when disabled", () => {
    const onOpen = jest.fn();
    renderWithMantine(
      <OpenInformationWindowAnchor onOpen={onOpen} disabled>
        Disabled
      </OpenInformationWindowAnchor>,
    );
    screen.getByText("Disabled").click();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
