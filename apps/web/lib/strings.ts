/**
 * The first of `values` that has visible text, else `undefined`.
 *
 * Deliberately not a `??` chain. `??` only falls through on null and undefined,
 * so a field that is *present but blank* short-circuits it and hides the usable
 * fallback behind it. Several EVE name columns are exactly that — present,
 * empty: `DogmaAttribute.displayName` and `DogmaUnit.displayName` are nullable
 * in the SDE and routinely blank, and ESI's optional `display_name` behaves the
 * same way.
 *
 * `app/history/actions.ts` and `lib/history-names.ts` each carry a local copy of
 * this predating the module; new callers should import this one.
 */
export const firstNonEmpty = (
  ...values: (string | null | undefined)[]
): string | undefined =>
  values
    .map((value) => value?.trim())
    .find((value) => value !== undefined && value !== "");
