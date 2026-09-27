/**
 * Mantine's rem base: `1rem` is 16px unless the app overrides the root font
 * size, which this one does not.
 */
const REM_IN_PX = 16;

/**
 * A CSS length with an optional unit. Units are matched case-insensitively
 * because CSS units are; the sign is captured so a non-positive length can be
 * told apart from an unreadable one.
 *
 * Written to backtrack linearly: the two number alternatives start with
 * different characters, the optional fraction needs a literal `.` so `\d+`
 * cannot re-split a digit run, and surrounding whitespace is trimmed off by the
 * caller rather than matched with `\s*` (two adjacent `\s*` around the optional
 * unit is the other way this pattern goes polynomial).
 */
const CSS_LENGTH = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em)?$/i;

/**
 * Read a CSS length Mantine accepts as a `size` prop (`"64"`, `"64px"`,
 * `"1rem"`) as a pixel number. Returns undefined only when the value is not a
 * length at all — a readable but non-positive length comes back as its own
 * value so the caller can treat it like `size={0}`.
 *
 * `em` is approximated as `rem`. It is really relative to the element's own
 * font size, which is not knowable here; the approximation is right whenever
 * the font size is inherited from the root, and is far closer than the
 * unreadable-value fallback.
 */
function parseCssLength(value: string): number | undefined {
  const match = CSS_LENGTH.exec(value.trim());
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2]?.toLowerCase();
  return unit === "rem" || unit === "em" ? amount * REM_IN_PX : amount;
}

/**
 * Resolve an avatar's `size` prop to a pixel value.
 *
 * Mantine accepts three shapes: a named size (`"md"`), a raw pixel number
 * (`64`), and a CSS length string (`"1rem"`, `"64px"`). Only the named sizes
 * live in `sizes`; the other two have to be read as lengths. Reading them as
 * unknown instead is not harmless — callers use this number both to pick the
 * image resolution to request from the EVE image server and to size fallback
 * SVG icons, so a `size={20}` avatar would ask for a 1024x1024 render and draw
 * a 1024px icon.
 */
export function getAvatarSize<
  Sizes extends Record<string, number>,
  Size extends string | number | undefined,
>({ size, sizes }: { size: Size; sizes: Sizes }): number {
  // No size — or a falsy one, which includes 0 and "" — means "use the default".
  const defaultSize = sizes.md ?? 1024;
  if (!size) return defaultSize;

  // A bare number is pixels. A non-positive one is meaningless as a dimension
  // (and would make the image-size clamp produce NaN), so treat it as no size.
  if (typeof size === "number") return size > 0 ? size : defaultSize;

  if (size in sizes) {
    // `size in sizes` guarantees the entry exists; the `?? 1024` only satisfies
    // `noUncheckedIndexedAccess` (which widens the lookup to `number | undefined`)
    // and is never actually taken.
    return sizes[size] ?? 1024;
  }

  const length = parseCssLength(size);

  // Not a length at all. Falling back to the largest size is deliberate:
  // over-fetching an image beats rendering a large avatar from a thumbnail.
  if (length === undefined) return 1024;

  // A length we could read but cannot draw, e.g. "0" or "-5px". Mantine treats
  // `size="0"` and `size={0}` alike, so this must match the numeric branch
  // rather than falling through to the 1024 over-fetch.
  return length > 0 ? length : defaultSize;
}
