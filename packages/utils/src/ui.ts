/**
 * Mantine's rem base: `1rem` is 16px unless the app overrides the root font
 * size, which this one does not.
 */
const REM_IN_PX = 16;

/**
 * Read a CSS length Mantine accepts as a `size` prop (`"64"`, `"64px"`,
 * `"1rem"`) as a pixel number. Returns undefined for anything that is not a
 * positive length.
 */
function parseCssLength(value: string): number | undefined {
  const match = /^\s*(\d*\.?\d+)\s*(px|rem|em)?\s*$/.exec(value);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const unit = match[2];
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

  // Whatever is left is either a CSS length or something we cannot read.
  // Falling back to the largest size is deliberate: over-fetching an image
  // beats rendering a large avatar from a thumbnail.
  return parseCssLength(size) ?? 1024;
}
