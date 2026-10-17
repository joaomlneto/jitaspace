import { createTheme } from "@mantine/core";

/**
 * EVE (compact) — the EVE theme, denser: more on screen at once for the
 * table- and list-heavy pages.
 *
 * Overrides over EVE (./eve.ts), which ./index.ts merges them over.
 * {@link eveCompactTheme} tightens the spacing scale, which Mantine's gaps,
 * paddings and table rows all read, and scales the headings down. Body text
 * keeps EVE's sizes and line heights: a Mantine List stacks its items with no
 * gap, so a list of links is as tall as its lines, and anything under 1.5 at
 * 16px puts them closer than the 24px minimum target size (WCAG 2.5.8).
 * {@link eveCompactControlsTheme} also shrinks the controls, and applies only
 * with a mouse or trackpad: on a touchscreen they keep EVE's sizes, so they
 * stay easy to tap.
 */

const rem = (px: number): string => `${px / 16}rem`;

export const eveCompactTheme = createTheme({
  // About 60% of EVE's (8 / 10 / 14 / 20 / 28).
  spacing: {
    xs: rem(4),
    sm: rem(6),
    md: rem(9),
    lg: rem(13),
    xl: rem(18),
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
    Card: { defaultProps: { padding: "md" } },
  },
});

/**
 * Controls one size down from Mantine's defaults: 30px buttons and inputs
 * instead of 36px. Still clear of the 24px minimum target size (WCAG 2.5.8),
 * but for a mouse, not a finger.
 */
export const eveCompactControlsTheme = createTheme({
  components: {
    Button: { defaultProps: { size: "xs" } },
    Input: { defaultProps: { size: "xs" } },
    InputWrapper: { defaultProps: { size: "xs" } },
    SegmentedControl: { defaultProps: { size: "xs" } },
    Badge: { defaultProps: { size: "sm" } },
  },
});
