import Decimal from "decimal.js";

export const recordsAreEqual = <
  T extends Record<string | number | symbol, any>,
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
      // different types? this shouldn't happen
      if (typeof a[key] !== typeof b[key]) return false;

      // check if we are comparing Decimals (decimal.js)
      if (Decimal.isDecimal(a[key])) {
        //console.log("decimal", a[key], b[key]);
        return a[key].comparedTo(b[key]) == 0;
      }

      // check if we are dealing with null values
      // typeof returns "object" because javascript
      if (a[key] === null || b[key] === null) {
        return a[key] === null && b[key] === null;
      }

      // check if we are comparing objects
      if (typeof a[key] == "object") {
        //console.log("object", a[key], b[key]);
        return recordsAreEqual(a[key], b[key], opts);
      }

      // check if we are comparing floats
      if (typeof a[key] == "number" && (a[key] % 1 !== 0 || b[key] % 1 !== 0)) {
        //console.log("number", a[key], b[key]);
        return a[key].toString() == b[key].toString();
      }

      return a[key] == b[key];
    });
