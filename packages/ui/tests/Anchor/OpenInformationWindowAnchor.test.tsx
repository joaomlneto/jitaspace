import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import { OpenInformationWindowAnchor } from "../../Anchor/OpenInformationWindowAnchor";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("OpenInformationWindowAnchor", () => {
  it("is a keyboard-reachable button, not an href-less link", () => {
    renderWithMantine(
      <OpenInformationWindowAnchor onOpen={() => undefined}>
        Show info
      </OpenInformationWindowAnchor>,
    );
    const button = screen.getByRole("button", { name: "Show info" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    button.focus();
    expect(button).toHaveFocus();
  });

  it("calls onOpen when activated", () => {
    const onOpen = jest.fn();
    renderWithMantine(
      <OpenInformationWindowAnchor onOpen={onOpen}>
        Show info
      </OpenInformationWindowAnchor>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show info" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("stays focusable but inert and announced as disabled", () => {
    const onOpen = jest.fn();
    renderWithMantine(
      <OpenInformationWindowAnchor onOpen={onOpen} disabled>
        Show info
      </OpenInformationWindowAnchor>,
    );
    const button = screen.getByRole("button", { name: "Show info" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
