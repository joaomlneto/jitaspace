export function toArrayIfNot<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function randomProperty<V>(obj: Record<string | number | symbol, V>): V {
  const keys = Object.keys(obj);
  const randomIndex = Math.floor(Math.random() * keys.length);
  const randomKey = keys[randomIndex] as keyof typeof obj;
  return obj[randomKey] as V;
}

export function removeUndefinedFields<T>(
  obj: Record<string, T>,
): Record<string, T> {
  Object.keys(obj).forEach((key) =>
    obj[key] === undefined ? delete obj[key] : {},
  );
  return obj;
}
