/**
 * The first of `values` that has visible text, else `undefined`.
 *
 * Deliberately not a `??` chain. `??` only falls through on null and undefined,
 * so a field that is *present but blank* short-circuits it and hides the usable
 * fallback behind it — and several SDE name columns are exactly that: present,
 * empty. `DogmaAttribute.displayName` and `.name` are both nullable, so
 * `displayName ?? name` silently yields `""` for any attribute whose display
 * name is blank rather than absent.
 *
 * Mirrors `firstNonEmpty` in `apps/web/app/history/actions.ts` and
 * `apps/web/lib/history-names.ts`; duplicated rather than shared because a
 * package cannot depend on the web app.
 */
export const firstNonEmpty = (
  ...values: (string | null | undefined)[]
): string | undefined =>
  values
    .map((value) => value?.trim())
    .find((value) => value !== undefined && value !== "");
