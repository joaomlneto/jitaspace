import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import type * as LoginWithEveOnlineButtonModule from "../../Button/LoginWithEveOnlineButton";

// next/image needs the Next runtime; a plain <img> is enough to assert on the
// dimensions the button computes.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

const { LoginWithEveOnlineButton } =
  require("../../Button/LoginWithEveOnlineButton") as typeof LoginWithEveOnlineButtonModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("LoginWithEveOnlineButton", () => {
  it("paints a hover background while hovered and clears it after", () => {
    renderWithMantine(<LoginWithEveOnlineButton />);
    const button = screen.getByRole("button");

    // Regression: the hover state used to live in a "&:hover" key inside the
    // inline style object, which React silently drops.
    expect(button.style.backgroundColor).toBe("");
    fireEvent.mouseEnter(button);
    expect(button.style.backgroundColor).not.toBe("");
    fireEvent.mouseLeave(button);
    expect(button.style.backgroundColor).toBe("");
  });

  it("sizes the image from the width prop without leaking it onto the button", () => {
    renderWithMantine(<LoginWithEveOnlineButton width={390} size="large" />);

    const image = screen.getByAltText("Login with EVE Online");
    expect(image).toHaveAttribute("width", "390");
    // 390 is 270 * 1.44…, so the 45px-tall large asset scales to 65.
    expect(image).toHaveAttribute("height", "65");
    // `width` is a component prop, not a DOM attribute of <button>.
    expect(screen.getByRole("button")).not.toHaveAttribute("width");
  });

  it("keeps the hover background when the caller supplies its own style", () => {
    // Regression: otherProps was spread after `style`, so a caller-supplied
    // style replaced the whole computed object and silently killed the hover.
    renderWithMantine(<LoginWithEveOnlineButton style={{ width: "100%" }} />);
    const button = screen.getByRole("button");

    expect(button.style.width).toBe("100%");
    fireEvent.mouseEnter(button);
    expect(button.style.backgroundColor).not.toBe("");
    expect(button.style.display).toBe("block");
  });

  it("carries Mantine's focus-ring class so keyboard users get an affordance", () => {
    renderWithMantine(<LoginWithEveOnlineButton className="custom" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("mantine-focus-auto");
    expect(button).toHaveClass("custom");
  });

  it("forwards onClick", () => {
    const onClick = jest.fn();
    renderWithMantine(<LoginWithEveOnlineButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
