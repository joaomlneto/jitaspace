import Decimal from "decimal.js";

export const recordsAreEqual = <
  T extends Record<string | number | symbol, unknown>,
>(
  a: T,
  b: T,
  opts?: {
    ignoreKeys?: (keyof T)[];
  },
): boolean =>
  Object.keys(a)
    .filter((key) => !(opts?.ignoreKeys ?? []).includes(key as keyof T))
    .every((key) => {
      const aValue: unknown = a[key];
      const bValue: unknown = b[key];

      // different types? this shouldn't happen
      if (typeof aValue !== typeof bValue) return false;

      // check if we are comparing Decimals (decimal.js)
      if (Decimal.isDecimal(aValue)) {
        //console.log("decimal", aValue, bValue);
        return aValue.comparedTo(bValue as Decimal.Value) == 0;
      }

      // check if we are dealing with null values
      // typeof returns "object" because javascript
      if (aValue === null || bValue === null) {
        return aValue === null && bValue === null;
      }

      // check if we are comparing objects
      if (typeof aValue == "object") {
        //console.log("object", aValue, bValue);
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
        //console.log("number", aValue, bValue);
        return aValue.toString() == bValue.toString();
      }

      return aValue == bValue;
    });
