import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import type * as TypeAvatarModule from "../../Avatar/TypeAvatar";

// eve-icons pulls in the sprite machinery; the placeholder only needs to exist.
jest.mock("@jitaspace/eve-icons", () => ({
  UnknownIcon: () => <span data-testid="unknown-icon" />,
}));

const { TypeAvatar } =
  require("../../Avatar/TypeAvatar") as typeof TypeAvatarModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const srcOf = (container: HTMLElement) =>
  container.querySelector("img")?.getAttribute("src");

describe("TypeAvatar (presentational)", () => {
  it("renders the requested variation", () => {
    const { container } = renderWithMantine(
      <TypeAvatar typeId={587} variation="bp" />,
    );
    expect(srcOf(container)).toContain("/types/587/bp");
  });

  it("defaults to the icon variation", () => {
    const { container } = renderWithMantine(<TypeAvatar typeId={587} />);
    expect(srcOf(container)).toContain("/types/587/icon");
  });

  it("never asks the image server which variations a type has", () => {
    // Regression: this component used to run an swr lookup against
    // images.evetech.net. That lookup now lives in the smart TypeAvatar in
    // @jitaspace/eve-components, keeping this package free of data fetching.
    const fetchSpy = jest.fn();
    const previousFetch = global.fetch;
    global.fetch = fetchSpy as unknown as typeof global.fetch;
    try {
      renderWithMantine(<TypeAvatar typeId={587} />);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = previousFetch;
    }
  });
});
