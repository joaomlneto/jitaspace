/**
 * What a `customDescription` written by Claude may contain, whatever it
 * describes: text plus links to ids from its own input, and nothing else.
 * Shared by the dogma effect and dogma attribute description scripts.
 */

/** Visible characters (link markup excluded) a description may use. */
export const MAX_VISIBLE_CHARS = 280;

/** Display name, else internal name, else the id; blanks count as missing. */
export function label(
  displayName: string | null,
  name: string | null,
  id: number,
) {
  const display = displayName?.trim();
  if (display) return display;
  return name ?? `#${id}`;
}

function problemWith(text: string, allowed: Set<string>): string | null {
  const withoutLinks = text.replace(
    /<a href="([^"<>]+)">([^<>]+)<\/a>/g,
    (_, href: string, inner: string) => {
      if (!allowed.has(href)) throw new Error(`link to ${href}`);
      return inner;
    },
  );
  if (/[<>]/.test(withoutLinks)) return "markup other than links";
  if (/&[#a-z0-9]+;/i.test(withoutLinks)) return "HTML entity";
  // A word starting with a digit is a number; digits inside internal
  // attribute names (shipBonusCarrierM1) are not.
  if (withoutLinks.split(/\W+/).some((word) => /^\d/.test(word))) {
    return "a number";
  }
  if (withoutLinks.length === 0) return "empty";
  if (withoutLinks.length > MAX_VISIBLE_CHARS) return "too long";
  return null;
}

/**
 * Why a description must be redone, or null when it is fine. `allowed` holds
 * every href it may link: `showinfo:<typeID>` or a site path.
 */
export function checkLinkedDescription(
  text: string,
  allowed: Set<string>,
): string | null {
  try {
    return problemWith(text, allowed);
  } catch (error) {
    return error instanceof Error ? error.message : "invalid link";
  }
}
