import { describe, expect, it } from "@jest/globals";
import { DEFAULT_THEME, luminance, mergeMantineTheme } from "@mantine/core";

import { themes } from "~/themes";

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** One scheme's half of a `light-dark(…, …)` value. */
const half = (value: string, scheme: "light" | "dark") => {
  const match = /^light-dark\((.*), (.*)\)$/.exec(value);
  if (!match) return value;
  return scheme === "light" ? match[1]! : match[2]!;
};

describe.each(["eve", "default", "caldari"] as const)(
  "the %s theme's filled controls",
  (name) => {
    const theme = mergeMantineTheme(DEFAULT_THEME, themes[name]);
    const primaryShade = (scheme: "light" | "dark") =>
      typeof theme.primaryShade === "number"
        ? theme.primaryShade
        : theme.primaryShade[scheme];

    // Reads a resolved value back to a colour: a theme colour variable, or
    // `--mantine-color-<name>-filled` (the theme's own shade).
    const toColor = (
      value: string,
      color: string,
      scheme: "light" | "dark",
    ) => {
      const v = half(value, scheme);
      const shade = /--mantine-color-[\w-]+?-(\d)\)$/.exec(v)?.[1];
      if (shade) return theme.colors[color]![Number(shade)]!;
      if (v.includes(`-${color}-filled`)) {
        return theme.colors[color]![primaryShade(scheme)];
      }
      if (v.includes("--mantine-color-black")) return theme.black;
      if (v.includes("--mantine-color-white")) return theme.white;
      return v;
    };

    it.each([
      "blue",
      "indigo",
      "violet",
      "grape",
      "pink",
      "red",
      "orange",
      "teal",
      "green",
      "gray",
      theme.primaryColor,
    ])("keep 4.5:1 text on %s on both schemes", (color) => {
      const resolved = theme.variantColorResolver({
        color,
        theme,
        variant: "filled",
      });
      for (const scheme of ["light", "dark"] as const) {
        const fill = toColor(resolved.background, color, scheme);
        const text = toColor(resolved.color, color, scheme);
        expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
      }
    });
  },
);
