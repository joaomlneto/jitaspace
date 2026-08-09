import Decimal from "decimal.js";

/**
 * Structural equality over a record's own enumerable keys, with the quirks the
 * ESI/SDE scrapers need: `Decimal` values compare by value, and floats compare
 * by their string form so `1.10` and `1.1` don't read as a change.
 *
 * `T` is constrained to `object`, not `Record<string, unknown>`: Prisma model
 * types are interfaces with no index signature, so they don't satisfy the
 * stricter constraint — which is why passing this to `compareSets` from
 * `updateTable<DbType extends object>` failed to type-check. Indexing happens
 * through a record view instead.
 */
export const recordsAreEqual = <T extends object>(
  a: T,
  b: T,
  opts?: {
    ignoreKeys?: (keyof T)[];
  },
): boolean => {
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;

  return Object.keys(a)
    .filter((key) => !(opts?.ignoreKeys ?? []).includes(key as keyof T))
    .every((key) => {
      const aValue: unknown = aRecord[key];
      const bValue: unknown = bRecord[key];

      // different types? this shouldn't happen
      if (typeof aValue !== typeof bValue) return false;

      // check if we are comparing Decimals (decimal.js)
      if (Decimal.isDecimal(aValue)) {
        return aValue.comparedTo(bValue as Decimal.Value) == 0;
      }

      // check if we are dealing with null values
      // typeof returns "object" because javascript
      if (aValue === null || bValue === null) {
        return aValue === null && bValue === null;
      }

      // check if we are comparing objects
      if (typeof aValue == "object") {
        return recordsAreEqual(
          aValue as Record<string, unknown>,
          bValue as Record<string, unknown>,
          opts as { ignoreKeys?: string[] } | undefined,
        );
      }

      // check if we are comparing floats
      if (
        typeof aValue == "number" &&
        typeof bValue == "number" &&
        (aValue % 1 !== 0 || bValue % 1 !== 0)
      ) {
        return aValue.toString() == bValue.toString();
      }

      return aValue == bValue;
    });
};
