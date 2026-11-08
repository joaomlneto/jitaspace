import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_THEME,
  luminance,
  mergeMantineTheme,
  toRgba,
} from "@mantine/core";

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

describe.each(["eve", "default", "caldari", "excel"] as const)(
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

    // The light variant's hover tint, as Mantine's v8 variables paint it (the
    // deeper of its two tints, so the lower contrast): the primary shade at
    // 12% over the body on the light scheme, shade (primary - 2) at 20% on
    // the dark one.
    const tint = (color: string, scheme: "light" | "dark") => {
      const shades = theme.colors[color]!;
      const p = primaryShade(scheme);
      const [fill, opacity, body] =
        scheme === "light"
          ? [shades[p], 0.12, theme.white]
          : [shades[Math.max(0, p - 2)]!, 0.2, theme.colors.dark[7]];
      const c = toRgba(fill);
      const b = toRgba(body);
      const mix = (x: number, y: number) =>
        Math.round(x * opacity + y * (1 - opacity));
      return `rgb(${mix(c.r, b.r)}, ${mix(c.g, b.g)}, ${mix(c.b, b.b)})`;
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
    ])("keep 4.5:1 light-variant text on %s on both schemes", (color) => {
      const resolved = theme.variantColorResolver({
        color,
        theme,
        variant: "light",
      });
      for (const scheme of ["light", "dark"] as const) {
        const v = half(resolved.color, scheme);
        if (v.includes("--mantine-color-black")) {
          expect(
            contrast(tint(color, scheme), theme.black),
          ).toBeGreaterThanOrEqual(4.5);
          continue;
        }
        if (v.includes("--mantine-color-white")) {
          expect(
            contrast(tint(color, scheme), theme.white),
          ).toBeGreaterThanOrEqual(4.5);
          continue;
        }
        const shade = /--mantine-color-[\w-]+?-(\d)\)$/.exec(v)?.[1];
        const p =
          scheme === "light"
            ? primaryShade("light")
            : Math.max(primaryShade("dark") - 5, 0);
        const text = theme.colors[color]![shade ? Number(shade) : p]!;
        expect(contrast(tint(color, scheme), text)).toBeGreaterThanOrEqual(4.5);
      }
    });
  },
);
