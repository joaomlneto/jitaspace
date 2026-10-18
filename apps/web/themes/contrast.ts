import type { MantineTheme, VariantColorsResolver } from "@mantine/core";
import {
  Checkbox,
  CheckboxIndicator,
  defaultVariantColorsResolver,
  Indicator,
  luminance,
  Pagination,
  parseThemeColor,
  Radio,
  RadioIndicator,
  Stepper,
  Timeline,
  toRgba,
} from "@mantine/core";

import { lightDark } from "./lightDark";

/**
 * Readable text on coloured controls, for the themes that use it (EVE and
 * its family, Excel), worked out per colour scheme against WCAG AA's 4.5:1:
 * the theme's `variantColorResolver`, for the `filled` variant (the theme's
 * black or white text, whichever contrasts more, on a fill stepped darker
 * where neither reaches 4.5:1) and the `light` one (a darker or lighter shade
 * of the colour on its tint, or black or white); and `vars` for the
 * components that bypass the resolver. A theme turns them on with
 * `autoContrast: true`, `variantColorResolver` and
 * `components: { ...contrastComponents }`.
 */

/* ---- Filled controls ------------------------------------------ */

// WCAG's contrast ratio between two colours' relative luminances.
const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Scheme = "light" | "dark";

const WHITE_TEXT = "var(--mantine-color-white)";
const BLACK_TEXT = "var(--mantine-color-black)";

/** Whichever of the theme's black and white contrasts more with a fill. */
const bestText = (theme: MantineTheme, fill: string) => {
  const l = luminance(fill);
  const onBlack = contrast(l, luminance(theme.black));
  const onWhite = contrast(l, luminance(theme.white));
  return {
    text: onBlack >= onWhite ? BLACK_TEXT : WHITE_TEXT,
    ratio: Math.max(onBlack, onWhite),
  };
};

/**
 * The text for a colour's own fill (`--mantine-color-<color>-filled`, its
 * primary shade on each scheme), per scheme. For the components that take
 * their text colour straight from Mantine's getContrastColor, which reads
 * the light scheme's shade alone: on the dark scheme that put white on the
 * light teal (#5ccbcb), about 1.8:1, on the active page of a Pagination, a
 * ticked Checkbox and the rest. (Pill Tabs read it too, but none are used
 * and Mantine's types leave out their variable.)
 */
const filledText = (theme: MantineTheme, color: string | undefined) => {
  const textOn = (colorScheme: Scheme) => {
    const { value } = parseThemeColor({
      color: color ?? theme.primaryColor,
      theme,
      colorScheme,
    });
    // A CSS variable (a virtual colour) cannot be measured here.
    return value.startsWith("var(") ? WHITE_TEXT : bestText(theme, value).text;
  };
  return lightDark(textOn("light"), textOn("dark"));
};

/** `filledText`, unless the component opts out of autoContrast. */
const autoContrastText = (
  theme: MantineTheme,
  { color, autoContrast }: { color?: string; autoContrast?: boolean },
) =>
  (autoContrast ?? theme.autoContrast) ? filledText(theme, color) : undefined;

/** `color` at `opacity` over `body`, as an rgb() string. */
const over = (color: string, opacity: number, body: string) => {
  const c = toRgba(color);
  const b = toRgba(body);
  const mix = (x: number, y: number) =>
    Math.round(x * opacity + y * (1 - opacity));
  return `rgb(${mix(c.r, b.r)}, ${mix(c.g, b.g)}, ${mix(c.b, b.b)})`;
};

/**
 * Text for the `light` variant (a pale tint of the colour behind its own
 * shade), per scheme. Mantine's v8 variables put the primary shade on a 10%
 * tint on the light scheme (12% on hover), and shade (primary − 5) on a 15%
 * tint of shade (primary − 2) on the dark one (20% on hover); mid-tone
 * colours fall short there (blue on its tint is 3.2:1). This walks darker on
 * the light scheme, lighter on the dark one, until the text reaches 4.5:1
 * against the hover tint over the body (the deeper tint, so the lower
 * contrast: a shade that passes there passes at rest too), and
 * where no shade does (EVE's teal.9 is ~4:1 on its tint) uses the theme's
 * black or white: the tint still carries the colour. Returns the CSS colour,
 * or undefined to keep Mantine's.
 */
const lightVariantText = (
  theme: MantineTheme,
  color: string,
  scheme: Scheme,
): string | undefined => {
  const shades = theme.colors[color];
  // A virtual colour's shades are CSS variables, which cannot be measured.
  if (!shades || shades[0].startsWith("var(")) return undefined;
  const primary =
    typeof theme.primaryShade === "number"
      ? theme.primaryShade
      : theme.primaryShade[scheme];
  const body = scheme === "light" ? theme.white : theme.colors.dark[7];
  const tint =
    scheme === "light"
      ? over(shades[primary], 0.12, body)
      : over(shades[Math.max(0, primary - 2)] ?? shades[primary], 0.2, body);
  const start = scheme === "light" ? primary : Math.max(primary - 5, 0);
  const step = scheme === "light" ? 1 : -1;
  for (let shade = start; shade >= 0 && shade <= 9; shade += step) {
    const text = shades[shade];
    if (text && contrast(luminance(text), luminance(tint)) >= 4.5) {
      return shade === start
        ? undefined
        : `var(--mantine-color-${color}-${shade})`;
    }
  }
  return scheme === "light" ? BLACK_TEXT : WHITE_TEXT;
};

// Mantine's autoContrast picks a filled control's text colour once, from the
// light scheme's shade, and uses it on both; and it picks by a luminance
// threshold, which gives mid-tone fills such as blue.6 light text at 3.1:1.
// Here the two schemes fill with different shades (#247070 takes white text,
// #5ccbcb dark text), so this picks per scheme: whichever of the theme's
// black and white contrasts more with the fill. And where neither reaches
// WCAG AA's 4.5:1 on the theme's shade (indigo.6, violet.6: about 4.4:1 either
// way), it fills one shade darker, and so on, until one does.
export const variantColorResolver: VariantColorsResolver = (input) => {
  const result = defaultVariantColorsResolver(input);
  const { theme } = input;
  const autoContrast =
    typeof input.autoContrast === "boolean"
      ? input.autoContrast
      : theme.autoContrast;
  if (!autoContrast) return result;

  if (input.variant === "light") {
    const color = input.color ?? theme.primaryColor;
    const parsed = parseThemeColor({ color, theme });
    // An explicit shade (`red.3`) or a plain CSS colour keeps Mantine's text.
    if (!parsed.isThemeColor || parsed.shade !== undefined) return result;
    const light = lightVariantText(theme, parsed.color, "light");
    const dark = lightVariantText(theme, parsed.color, "dark");
    if (light === undefined && dark === undefined) return result;
    return {
      ...result,
      color: lightDark(light ?? result.color, dark ?? result.color),
    };
  }

  if (input.variant !== "filled") return result;

  const textFor = (fill: string) => bestText(theme, fill);

  const pick = (colorScheme: Scheme) => {
    const parsed = parseThemeColor({
      color: input.color ?? theme.primaryColor,
      theme,
      colorScheme,
    });
    // A CSS variable (a virtual colour) cannot be measured here.
    if (parsed.value.startsWith("var(")) return { text: WHITE_TEXT };
    // A colour with an explicit shade (`red.3`) or a plain CSS colour keeps
    // its fill; only its text is chosen.
    if (!parsed.isThemeColor || parsed.shade !== undefined) {
      return { text: textFor(parsed.value).text };
    }
    const shades = theme.colors[parsed.color];
    const primaryShade =
      typeof theme.primaryShade === "number"
        ? theme.primaryShade
        : theme.primaryShade[colorScheme];
    if (!shades) return { text: textFor(parsed.value).text };
    for (let shade = primaryShade; shade <= 9; shade++) {
      const { text, ratio } = textFor(shades[shade]);
      if (ratio >= 4.5) {
        return shade === primaryShade ? { text } : { text, shade };
      }
    }
    return { text: textFor(parsed.value).text };
  };

  const light = pick("light");
  const dark = pick("dark");
  const shadeVar = (shade: number | undefined, fallback: string) =>
    shade === undefined
      ? fallback
      : `var(--mantine-color-${input.color ?? theme.primaryColor}-${shade})`;

  return {
    ...result,
    color: lightDark(light.text, dark.text),
    ...((light.shade !== undefined || dark.shade !== undefined) && {
      background: lightDark(
        shadeVar(light.shade, result.background),
        shadeVar(dark.shade, result.background),
      ),
      hover: lightDark(
        shadeVar(
          light.shade === undefined ? undefined : Math.min(light.shade + 1, 9),
          result.hover,
        ),
        shadeVar(
          dark.shade === undefined ? undefined : Math.min(dark.shade + 1, 9),
          result.hover,
        ),
      ),
    }),
  };
};

/** Per-scheme text for the components that bypass the resolver. */
export const contrastComponents = {
  // Text on a filled colour, for the components that bypass the
  // variantColorResolver (see `filledText`). An explicit iconColor wins.
  Pagination: Pagination.extend({
    vars: (theme, props) => ({
      root: { "--pagination-active-color": autoContrastText(theme, props) },
    }),
  }),
  Indicator: Indicator.extend({
    vars: (theme, props) => ({
      root: { "--indicator-text-color": autoContrastText(theme, props) },
    }),
  }),
  Stepper: Stepper.extend({
    vars: (theme, props) => ({
      root: { "--stepper-icon-color": autoContrastText(theme, props) },
    }),
  }),
  Timeline: Timeline.extend({
    vars: (theme, props) => ({
      root: { "--tl-icon-color": autoContrastText(theme, props) },
    }),
  }),
  Checkbox: Checkbox.extend({
    vars: (theme, props) => ({
      root: props.iconColor
        ? {}
        : { "--checkbox-icon-color": autoContrastText(theme, props) },
    }),
  }),
  CheckboxIndicator: CheckboxIndicator.extend({
    vars: (theme, props) => ({
      indicator: props.iconColor
        ? {}
        : { "--checkbox-icon-color": autoContrastText(theme, props) },
    }),
  }),
  Radio: Radio.extend({
    vars: (theme, props) => ({
      root: props.iconColor
        ? {}
        : { "--radio-icon-color": autoContrastText(theme, props) },
    }),
  }),
  RadioIndicator: RadioIndicator.extend({
    vars: (theme, props) => ({
      indicator: props.iconColor
        ? {}
        : { "--radio-icon-color": autoContrastText(theme, props) },
    }),
  }),
};
