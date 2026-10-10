import type { EveIconMetadata } from "@jitaspace/eve-icons";

/** Rendering options shared by the grid and the detail panel. */
export interface Appearance {
  /** Rendered size in CSS pixels. */
  size: number;
  /** Tint colour for single-colour glyphs, or `null` to show them as drawn. */
  tint: string | null;
}

/** Path of a native size of an icon, as copied into `public/icons/`. */
export function iconFile(icon: EveIconMetadata, width: number): string {
  return `/icons/${icon.id}.${width}.png`;
}

/**
 * The file the component would send for `size`: the smallest native size that
 * is sharp at 2x, or the largest. Mirrors `pickSource` in the package.
 */
export function bestWidth(icon: EveIconMetadata, size: number): number {
  return (
    icon.sizes.find((width) => width >= size * 2) ?? icon.sizes.at(-1) ?? 0
  );
}

/** `system/arrow-down` → `arrow-down`. */
export function shortName(icon: EveIconMetadata): string {
  return icon.id.slice(icon.set.length + 1);
}

/** Case-insensitive match against the ID, component name and set. */
export function matches(
  icon: EveIconMetadata,
  setLabel: string,
  query: string,
): boolean {
  if (!query) return true;
  const haystack = `${icon.id} ${icon.component} ${setLabel}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
