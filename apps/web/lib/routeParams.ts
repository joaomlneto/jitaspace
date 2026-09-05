/**
 * Parsing for the numeric `[entityId]` segments the entity routes are built on.
 *
 * The routes used to coerce the raw segment with `Number()` and test the
 * result, which accepts every alternative spelling of the same number. Measured
 * on production 2026-09-02: `/type/587`, `/type/0587` and `/type/587.0` each
 * returned HTTP 200 serving the Rifter — three URLs, one document, no canonical
 * between them. That is precisely what Search Console counts under "Duplicate
 * without user-selected canonical", and there is no bound on how many such
 * URLs a crawler can mint from a single real one.
 */

/**
 * The id in `raw`, or `null` if `raw` is not the canonical decimal spelling of
 * a safe non-negative integer.
 *
 * Rejects — rather than normalises — every other spelling (`"0587"`, `"587.0"`,
 * `"+587"`, `"5e2"`, `" 587"`, `"587\n"`), so each entity keeps exactly one
 * URL. Normalising would keep serving the duplicates; a `notFound()` retires
 * them. `"0"` itself is accepted because `/category/0` and `/group/0` are real
 * rows this site advertises in its sitemap; callers whose ids must be positive
 * apply that bound themselves, which is how every caller behaved before.
 *
 * The `Number.isSafeInteger` tail matters because the pattern admits digit
 * strings of any length: `"99999999999999999999"` parses to a float that would
 * silently mismatch any row it was compared against.
 */
export function parseEntityId(raw: string | undefined | null): number | null {
  if (typeof raw !== "string" || !/^(?:0|[1-9]\d*)$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * The same parse, but rejecting `0` — the bound almost every entity route
 * wants, since EVE ids for characters, types, systems, stations and the rest
 * start at 1.
 */
export function parsePositiveEntityId(
  raw: string | undefined | null,
): number | null {
  const id = parseEntityId(raw);
  return id === null || id <= 0 ? null : id;
}
