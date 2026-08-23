import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import { CharacterAvatar } from "../../Avatar/CharacterAvatar";
import { EveImageServerAvatar } from "../../Avatar/EveImageServerAvatar";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const requestedSize = (container: HTMLElement) => {
  const src = container.querySelector("img")?.getAttribute("src");
  return src === null || src === undefined
    ? undefined
    : new URL(src).searchParams.get("size");
};

// The image server serves powers of two between 32 and 1024, so the requested
// size is the avatar's pixel size rounded up into that range.
describe("EveImageServerAvatar image resolution", () => {
  it.each<[string, ReactElement, string]>([
    // Regression: a numeric size used to miss the named-size map entirely and
    // fall through to the 1024 default, so a 20px menu avatar downloaded a
    // 1024x1024 portrait.
    ["size={20}", <CharacterAvatar characterId={90000001} size={20} />, "32"],
    ["size={30}", <CharacterAvatar characterId={90000001} size={30} />, "32"],
    ["size={64}", <CharacterAvatar characterId={90000001} size={64} />, "64"],
    [
      "size={128}",
      <CharacterAvatar characterId={90000001} size={128} />,
      "128",
    ],
    // Same fall-through applied to CSS lengths.
    [
      'size="1rem"',
      <CharacterAvatar characterId={90000001} size="1rem" />,
      "32",
    ],
    // Named sizes always worked; keep them pinned.
    ['size="xs"', <CharacterAvatar characterId={90000001} size="xs" />, "32"],
    ['size="md"', <CharacterAvatar characterId={90000001} size="md" />, "64"],
    ['size="xl"', <CharacterAvatar characterId={90000001} size="xl" />, "128"],
    ["no size", <CharacterAvatar characterId={90000001} />, "64"],
  ])("requests %s at size=%s", (_label, element, expected) => {
    const { container } = renderWithMantine(element);
    expect(requestedSize(container)).toBe(expected);
  });

  // A HiDPI screen needs more device pixels than the CSS size. srcSet lets the
  // browser pick by its own devicePixelRatio and fetch exactly one candidate.
  describe("HiDPI candidates", () => {
    const srcSetOf = (container: HTMLElement) =>
      container.querySelector("img")?.getAttribute("srcset");

    it.each<[number, string, string]>([
      [20, "32", "64"],
      [64, "64", "128"],
      [128, "128", "256"],
    ])("offers a 2x candidate for size=%p", (size, oneX, twoX) => {
      const { container } = renderWithMantine(
        <CharacterAvatar characterId={90000001} size={size} />,
      );
      expect(requestedSize(container)).toBe(oneX);
      const srcSet = srcSetOf(container);
      expect(srcSet).toContain(`size=${oneX} 1x`);
      expect(srcSet).toContain(`size=${twoX} 2x`);
    });

    it("omits srcSet when both candidates clamp to the same size", () => {
      // 4096 and 8192 both cap at the server's 1024 maximum.
      const { container } = renderWithMantine(
        <CharacterAvatar characterId={90000001} size={4096} />,
      );
      expect(srcSetOf(container)).toBeNull();
    });
  });

  // Regression: with no id this substituted entity id 1 and rendered a real,
  // unrelated portrait — and interpolated the missing id into the alt text.
  describe("without an id", () => {
    it("renders no image at all, leaving Mantine's placeholder", () => {
      const { container } = renderWithMantine(<CharacterAvatar size={20} />);
      expect(container.querySelector("img")).toBeNull();
    });

    it("does not fall back to entity id 1", () => {
      const { container } = renderWithMantine(<CharacterAvatar size={20} />);
      expect(container.innerHTML).not.toContain("images.evetech.net");
      expect(container.innerHTML).not.toContain("/characters/1/");
    });

    // Mantine draws the placeholder as `<span title={alt}>`, not as an
    // `<img alt>`, so a description of an image that is not being shown
    // surfaces on the title. Assert on the element that actually exists.
    it.each<[string, ReactElement]>([
      ["CharacterAvatar", <CharacterAvatar size={20} />],
      [
        "EveImageServerAvatar",
        <EveImageServerAvatar category="corporations" variation="logo" />,
      ],
    ])("describes nothing rather than a missing id (%s)", (_label, element) => {
      const { container } = renderWithMantine(element);
      const placeholder = container.querySelector(
        ".mantine-Avatar-placeholder",
      );
      expect(placeholder).not.toBeNull();
      expect(placeholder).not.toHaveAttribute("title");
      expect(container.innerHTML).not.toContain("undefined");
    });
  });

  it("still describes the image when there is an id", () => {
    const { container } = renderWithMantine(
      <CharacterAvatar characterId={90000001} size="md" />,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "characters 90000001 portrait",
    );
  });

  it("lets a caller override the alt text", () => {
    const { container } = renderWithMantine(
      <CharacterAvatar characterId={90000001} alt="Some Pilot" />,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "Some Pilot",
    );
  });

  it("never asks for more than the server's 1024 maximum", () => {
    const { container } = renderWithMantine(
      <EveImageServerAvatar
        category="characters"
        id={90000001}
        variation="portrait"
        size={4096}
      />,
    );
    expect(requestedSize(container)).toBe("1024");
  });
});
