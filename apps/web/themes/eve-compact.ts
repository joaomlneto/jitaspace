import { Button, createTheme, Input } from "@mantine/core";

import classes from "./eve-compact.module.css";

/**
 * EVE (compact) — the EVE theme, denser: more on screen at once for the
 * table- and list-heavy pages.
 *
 * Overrides over EVE (./eve.ts), which ./index.ts merges them over.
 * {@link eveCompactTheme} tightens the spacing scale, which Mantine's gaps,
 * paddings and table rows all read, trims the side padding of buttons and
 * badges, which the scale does not reach, and scales the headings down. Body
 * text keeps EVE's sizes and line heights: a Mantine List stacks its items
 * with no gap, so a list of links is as tall as its lines, and anything under
 * 1.5 at 16px puts them closer than the 24px minimum target size (WCAG 2.5.8).
 * {@link eveCompactControlsTheme} also shrinks the controls, and applies only
 * with a mouse or trackpad: on a touchscreen they keep EVE's sizes, so they
 * stay easy to tap.
 */

const rem = (px: number): string => `${px / 16}rem`;

export const eveCompactTheme = createTheme({
  // About half to 60% of EVE's (8 / 10 / 14 / 20 / 28): the larger steps,
  // the gaps between sections and cards, shrink the most.
  spacing: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(11),
    xl: rem(15),
  },

  headings: {
    sizes: {
      h1: { fontSize: rem(30), lineHeight: "1.15" },
      h2: { fontSize: rem(24), lineHeight: "1.15" },
      h3: { fontSize: rem(19), lineHeight: "1.15" },
      h4: { fontSize: rem(16), lineHeight: "1.15" },
      h5: { fontSize: rem(14), lineHeight: "1.15" },
      h6: { fontSize: rem(13), lineHeight: "1.15" },
    },
  },

  components: {
    Card: { defaultProps: { padding: "sm" } },
    Button: { classNames: { root: classes.button } },
    Badge: { classNames: { root: classes.badge } },
  },
});

/**
 * 30px buttons and inputs with EVE's 14px text. The default size (Mantine's
 * `sm`) is shortened from 36px to 30px; `xs`, already 30px and which many
 * pages ask for explicitly, takes 14px text instead of 12px, which in
 * Rajdhani's bold capitals is the smallest text on the page. Larger sizes are
 * left as they are. Still clear of the 24px minimum target size (WCAG 2.5.8),
 * but for a mouse, not a finger.
 */
// The CSS variables a 30px control needs for its size: the default (`sm`, or
// none given) is shortened; `xs`, already 30px, takes 14px text; others keep
// Mantine's own.
const at30px = (
  size: unknown,
  component: "button" | "input",
): Record<string, string> => {
  if (size === undefined || size === "sm") {
    return { [`--${component}-height`]: `var(--${component}-height-xs)` };
  }
  if (size === "xs") {
    return { [`--${component}-fz`]: "var(--mantine-font-size-sm)" };
  }
  return {};
};

export const eveCompactControlsTheme = createTheme({
  components: {
    Button: Button.extend({
      vars: (_theme, { size }) => ({ root: at30px(size, "button") }),
    }),
    // Every input renders an Input, whatever its own default size
    // (TextInput has none; Select, NumberInput and most others say `sm`).
    Input: Input.extend({
      vars: (_theme, { size }) => ({ wrapper: at30px(size, "input") }),
    }),
    SegmentedControl: { defaultProps: { size: "xs" } },
    Badge: { defaultProps: { size: "sm" } },
  },
});
