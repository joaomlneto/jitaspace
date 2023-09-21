export const recordsAreEqual = <
  T extends Record<string | number | symbol, any>,
>(
  a: T,
  b: T,
  opts?: {
    ignoreKeys?: (keyof T)[];
  },
) =>
  Object.keys(a)
    .filter((key) => !(opts?.ignoreKeys ?? []).includes(key as keyof T))
    .every((key) => a[key] == b[key]);
