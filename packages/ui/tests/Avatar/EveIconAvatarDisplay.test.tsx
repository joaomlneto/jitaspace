import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import {
  EveIconAvatarDisplay,
  eveIconFileUrl,
} from "../../Avatar/EveIconAvatarDisplay";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("eveIconFileUrl", () => {
  it("strips the SDE resource prefix and points at the icon collection", () => {
    expect(eveIconFileUrl("res:/ui/texture/icons/9_64_1.png")).toBe(
      "https://iec.jita.space/items/9_64_1.png",
    );
  });

  it.each([[undefined], [null], [""]])(
    "returns undefined for %p so the avatar can fall back",
    (iconFile) => {
      expect(eveIconFileUrl(iconFile)).toBeUndefined();
    },
  );
});

describe("EveIconAvatarDisplay", () => {
  it("renders the icon the caller already resolved", () => {
    const { container } = renderWithMantine(
      <EveIconAvatarDisplay iconFile="res:/ui/texture/icons/9_64_1.png" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://iec.jita.space/items/9_64_1.png",
    );
  });

  it("renders the placeholder when the group has no icon", () => {
    const { container } = renderWithMantine(
      <EveIconAvatarDisplay iconFile={null} />,
    );
    // With no src Mantine renders the Avatar's children — the placeholder.
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://iec.jita.space/items/7_64_15.png",
    );
  });

  it("forwards avatar props such as size and alt", () => {
    const { container } = renderWithMantine(
      <EveIconAvatarDisplay
        iconFile="res:/ui/texture/icons/9_64_1.png"
        size={24}
        alt="Ships"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "Ships");
  });
});
