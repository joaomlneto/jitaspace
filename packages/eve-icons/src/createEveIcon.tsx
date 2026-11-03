import type { CSSProperties, ImgHTMLAttributes, ReactElement } from "react";

/** One native size of an icon. */
export interface EveIconSource {
  width: number;
  height: number;
  /** The PNG, as a data URI. */
  src: string;
  /** The client file it was copied from, e.g. `res:/ui/texture/…png`. */
  path: string;
}

export interface EveIconDefinition {
  /** `<set>/<name>`, e.g. `system/arrow-down`. */
  id: string;
  /** Default accessible name, e.g. `Arrow down`. */
  label: string;
  /** Single-colour glyph: can be re-coloured with the `color` prop. */
  monochrome: boolean;
  /** Native sizes, smallest first. */
  sources: readonly EveIconSource[];
}

export type EveIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height" | "color"
> & {
  /** Rendered width in CSS pixels. Defaults to the icon's smallest native size. */
  size?: number;
  width?: number | `${number}`;
  height?: number | `${number}`;
  /** Fill the nearest positioned ancestor, like `next/image`'s `fill`. */
  fill?: boolean;
  /**
   * Re-colour the icon with any CSS colour, `currentColor` included. Only
   * single-colour glyphs (`icon.monochrome`) can be tinted; full-colour icons
   * ignore it and render as drawn.
   */
  color?: string;
};

export type EveIconComponent = ((props: EveIconProps) => ReactElement) & {
  displayName: string;
  icon: EveIconDefinition;
};

/** Device pixel ratio assumed when choosing which native size to send. */
const TARGET_DENSITY = 2;

const FILL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/** `<img>` attributes that mean nothing on the `<span>` a tinted icon renders. */
const IMG_ONLY_PROPS = [
  "crossOrigin",
  "decoding",
  "fetchPriority",
  "isMap",
  "loading",
  "referrerPolicy",
  "sizes",
  "useMap",
] as const;

function toNumber(value: number | `${number}` | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

/**
 * Of `widths` (ascending), the smallest that still looks sharp at `cssWidth`
 * on a high-density screen, or the largest there is.
 */
export function pickWidth(
  widths: readonly number[],
  cssWidth: number | undefined,
): number {
  const largest = widths.at(-1);
  if (largest === undefined) throw new Error("An icon needs at least one size");
  if (cssWidth === undefined) return largest;
  return widths.find((width) => width >= cssWidth * TARGET_DENSITY) ?? largest;
}

/** The native size {@link pickWidth} chooses for `cssWidth`. */
export function pickSource(
  sources: readonly EveIconSource[],
  cssWidth: number | undefined,
): EveIconSource {
  const width = pickWidth(
    sources.map((source) => source.width),
    cssWidth,
  );
  const source = sources.find((candidate) => candidate.width === width);
  if (!source) throw new Error("An icon needs at least one source");
  return source;
}

/**
 * Styles that paint `color` through the image at `src` used as a mask: how a
 * single-colour glyph is tinted.
 */
export function tintStyle(src: string, color: string): CSSProperties {
  const mask = `url("${src}") center / contain no-repeat`;
  return { backgroundColor: color, mask, WebkitMask: mask };
}

/**
 * Resolve the rendered box. An explicit width or height wins (the other
 * follows the icon's aspect ratio), then `size`, then the smallest native size.
 */
export function resolveSize(
  icon: EveIconDefinition,
  { size, width, height }: Pick<EveIconProps, "size" | "width" | "height">,
): { width: number; height: number } {
  const base = icon.sources[0];
  if (!base) throw new Error(`${icon.id} has no sources`);
  const aspect = base.height / base.width;
  const w = toNumber(width);
  const h = toNumber(height);
  if (w !== undefined && h !== undefined) return { width: w, height: h };
  if (w !== undefined) return { width: w, height: w * aspect };
  if (h !== undefined) return { width: h / aspect, height: h };
  const resolved = size ?? base.width;
  return { width: resolved, height: resolved * aspect };
}

/** Build the component for one icon. Used by the generated modules. */
export function createEveIcon(icon: EveIconDefinition): EveIconComponent {
  const EveIcon = ({
    size,
    width,
    height,
    fill,
    color,
    alt,
    style,
    ...rest
  }: EveIconProps) => {
    const box = fill ? undefined : resolveSize(icon, { size, width, height });
    const source = pickSource(icon.sources, box?.width);

    if (color !== undefined && icon.monochrome) {
      const spanProps: Record<string, unknown> = { ...rest };
      for (const key of IMG_ONLY_PROPS) delete spanProps[key];
      const decorative = alt === "";
      return (
        <span
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : (alt ?? icon.label)}
          aria-hidden={decorative ? true : undefined}
          {...spanProps}
          style={{
            display: "inline-block",
            flexShrink: 0,
            ...(box ?? FILL_STYLE),
            ...tintStyle(source.src, color),
            ...style,
          }}
        />
      );
    }

    return (
      // Plain <img>: the artwork is an inline data URI, so there is nothing for
      // an image optimiser to fetch or resize.
      <img
        alt={alt ?? icon.label}
        decoding="async"
        {...rest}
        src={source.src}
        width={box?.width}
        height={box?.height}
        style={fill ? { ...FILL_STYLE, ...style } : style}
      />
    );
  };
  EveIcon.displayName = icon.id;
  return Object.assign(EveIcon, { icon });
}
