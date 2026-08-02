import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import { EveIconAvatar, eveIconUrl } from "../../Avatar/EveIconAvatar";
import { EveIconAvatarPlaceholder } from "../../Avatar/EveIconAvatarPlaceholder";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("eveIconUrl", () => {
  it("addresses the icon server by icon id", () => {
    expect(eveIconUrl(1443)).toBe("https://icons.jita.space/icons/1443");
  });

  it.each([[undefined], [null]])("falls back to icon id 0 for %p", (iconId) => {
    expect(eveIconUrl(iconId)).toBe("https://icons.jita.space/icons/0");
  });
});

describe("EveIconAvatar", () => {
  it("renders the icon for the given id without any lookup", () => {
    const { container } = renderWithMantine(<EveIconAvatar iconId={1443} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://icons.jita.space/icons/1443",
    );
  });

  it("renders the placeholder icon when there is no id", () => {
    const { container } = renderWithMantine(<EveIconAvatar iconId={null} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://icons.jita.space/icons/0",
    );
  });

  it("defaults alt text to the icon id and forwards avatar props", () => {
    const { container } = renderWithMantine(
      <EveIconAvatar iconId={1443} size={24} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "Icon 1443");
  });

  it("uses a caller-provided alt", () => {
    const { container } = renderWithMantine(
      <EveIconAvatar iconId={1443} alt="Ships" />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "Ships");
  });
});

describe("EveIconAvatarPlaceholder", () => {
  it("renders the icon server's unknown-icon image", () => {
    const { container } = renderWithMantine(<EveIconAvatarPlaceholder />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://icons.jita.space/icons/0",
    );
  });
});
