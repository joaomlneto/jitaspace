/**
 * The colours a player corporation picked in-game, as ESI reports them under
 * `palette` on `GET /corporations/{corporation_id}`. Only `main_color` is
 * required, and NPC corporations (and some player ones) have no palette at all.
 */
export interface CorporationPalette {
  main_color: string;
  secondary_color?: string;
  tertiary_color?: string;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** One of a corporation's palette colours, with the slot it fills. */
export interface CorporationPaletteSlot {
  role: "Main" | "Secondary" | "Tertiary";
  color: string;
}

const PALETTE_SLOTS = [
  ["Main", "main_color"],
  ["Secondary", "secondary_color"],
  ["Tertiary", "tertiary_color"],
] as const;

/**
 * The corporation's colours in palette order (main, secondary, tertiary), each
 * tagged with its slot, keeping only well-formed `#rrggbb` values. Returns an
 * empty array when the corporation has no palette, so callers can render their
 * unbranded layout.
 *
 * Colours are passed through as the corporation chose them — black and white
 * included — rather than adjusted for the current theme.
 */
export const getCorporationPaletteSlots = (
  palette?: CorporationPalette | null,
): CorporationPaletteSlot[] =>
  PALETTE_SLOTS.flatMap(([role, field]) => {
    const color = palette?.[field];
    return color !== undefined && HEX_COLOR.test(color)
      ? [{ role, color }]
      : [];
  });

/** {@link getCorporationPaletteSlots}, colours only. */
export const getCorporationPaletteColors = (
  palette?: CorporationPalette | null,
): string[] => getCorporationPaletteSlots(palette).map(({ color }) => color);

/** sRGB channels in 0–1. */
type Rgb = readonly [number, number, number];
/** OKLab lightness and the two opponent axes. */
type Lab = readonly [number, number, number];

/** Parses `#rgb` or `#rrggbb` (theme colours use both). */
const parseHex = (color: string): Rgb | undefined => {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  const parts = short
    ? short.slice(1).map((digit) => digit + digit)
    : long?.slice(1);
  if (!parts) return undefined;
  const [r = 0, g = 0, b = 0] = parts.map(
    (part) => Number.parseInt(part, 16) / 255,
  );
  return [r, g, b];
};

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const toGamma = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

const toOklab = ([r, g, b]: Rgb): Lab => {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([L, a, b]: Lab): Rgb => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

const toHex = (rgb: Rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/** WCAG 2 contrast ratio between two colours, 1–21. */
export const contrastRatio = (first: string, second: string): number => {
  const luminance = (color: string) => {
    const [r, g, b] = (parseHex(color) ?? [0, 0, 0]).map(toLinear);
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const [x, y] = [luminance(first), luminance(second)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Black or white, whichever keeps the better worst-case contrast across every
 * colour it will sit on (each stop of a gradient).
 */
export const getReadableTextColor = (backgrounds: readonly string[]) => {
  const worst = (text: string) =>
    Math.min(...backgrounds.map((bg) => contrastRatio(bg, text)));
  return worst("#ffffff") >= worst("#000000") ? "#ffffff" : "#000000";
};

/** Moves `from` a fraction `amount` of the way to `to`, in OKLab. */
const mixOklab = (from: string, to: string, amount: number) => {
  const [p, q] = [parseHex(from), parseHex(to)];
  if (!p || !q) return from;
  const [a, b] = [toOklab(p), toOklab(q)];
  const mix = (i: 0 | 1 | 2) => a[i] + (b[i] - a[i]) * amount;
  return toHex(fromOklab([mix(0), mix(1), mix(2)]));
};

/** Shifts a colour's OKLab lightness, easing chroma until it stays in sRGB. */
const shiftLightness = (color: string, delta: number) => {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const [L, a, b] = toOklab(rgb);
  const lightness = Math.min(1, Math.max(0, L + delta));
  let scale = 1;
  for (
    let i = 0;
    i < 20 && !inGamut(fromOklab([lightness, a * scale, b * scale]));
    i++
  ) {
    scale *= 0.9;
  }
  return toHex(fromOklab([lightness, a * scale, b * scale]));
};

/**
 * How far a palette colour's hue pulls the card surface in the background wash:
 * 14% of the colour's chroma, boosted ×1.6 because the wash keeps the surface's
 * lightness (only hue and chroma move, so it needs a little more to register).
 */
export const PALETTE_WASH_CHROMA = 0.224;

/** How far (in OKLab lightness) a tint may darken a near-white surface. */
const MAX_TINT_DARKENING = 0.03;

/**
 * Tints `surface` towards the hue of `color` while keeping its lightness, so
 * black, white and grey palettes (which carry no hue) leave the surface as it
 * is instead of greying it, and text on the tint keeps its contrast.
 *
 * A near-white surface has no room for chroma at its own lightness, so the
 * tint may darken it by up to {@link MAX_TINT_DARKENING}; past that it gives
 * up chroma instead. That keeps text contrast on a light wash within ~10% of
 * the plain card even for fully saturated colours.
 */
export const getPaletteTint = (
  color: string,
  surface: string,
  amount = PALETTE_WASH_CHROMA,
): string | undefined => {
  const [p, q] = [parseHex(color), parseHex(surface)];
  if (!p || !q) return undefined;
  const [pc, qc] = [toOklab(p), toOklab(q)];
  let a = qc[1] + (pc[1] - qc[1]) * amount;
  let b = qc[2] + (pc[2] - qc[2]) * amount;
  let L = qc[0];
  const floor = qc[0] - MAX_TINT_DARKENING;
  while (!inGamut(fromOklab([L, a, b])) && L > floor) L -= 0.002;
  // Converges: at zero chroma the tint is the surface itself, which is in sRGB.
  for (let i = 0; i < 100 && !inGamut(fromOklab([L, a, b])); i++) {
    a = qc[1] + (a - qc[1]) * 0.95;
    b = qc[2] + (b - qc[2]) * 0.95;
  }
  return toHex(fromOklab([L, a, b]));
};

/**
 * The background wash behind a corporation's name: a diagonal gradient through
 * a hue-only tint of each palette colour, interpolated in OKLab. A single
 * colour gives a flat tint. Undefined without a palette or a parseable surface.
 */
export const getCorporationPaletteWash = (
  colors: readonly string[],
  surface: string,
): string | undefined => {
  const tints = colors
    .map((color) => getPaletteTint(color, surface))
    .filter((tint): tint is string => tint !== undefined);
  if (tints.length === 0) return undefined;
  if (tints.length === 1) return tints[0];
  const stops = tints.map(
    (tint, i) => `${tint} ${Math.round((i * 100) / (tints.length - 1))}%`,
  );
  return `linear-gradient(135deg in oklab, ${stops.join(", ")})`;
};

/**
 * The ticker badge fill: the main colour drifting 40% of the way towards the
 * secondary along the badge. With only a main colour it gets a slight sheen
 * instead (lighter at the top, or darker at the bottom for very light colours).
 * Text is black or white, whichever stays readable across the whole gradient.
 */
export const getCorporationTickerFill = (
  colors: readonly string[],
): { background: string; fallback: string; color: string } | undefined => {
  const [main, secondary] = colors;
  if (main === undefined) return undefined;
  let stops: [string, string];
  if (secondary !== undefined) {
    stops = [main, mixOklab(main, secondary, 0.4)];
  } else {
    const rgb = parseHex(main);
    const light = rgb !== undefined && toOklab(rgb)[0] > 0.88;
    stops = light
      ? [main, shiftLightness(main, -0.07)]
      : [shiftLightness(main, 0.07), main];
  }
  const angle = secondary !== undefined ? 135 : 180;
  return {
    background: `linear-gradient(${angle}deg in oklab, ${stops[0]}, ${stops[1]})`,
    fallback: main,
    color: getReadableTextColor(stops),
  };
};

/**
 * Whether the ticker badge needs a hairline edge on `surface`: true when its
 * main colour falls below 3:1 (WCAG non-text contrast) against what sits
 * behind it, which is the wash tinted by that same colour.
 */
export const tickerNeedsEdge = (
  colors: readonly string[],
  surface: string,
): boolean => {
  const [main] = colors;
  if (main === undefined) return false;
  return contrastRatio(main, getPaletteTint(main, surface) ?? surface) < 3;
};
