export function toArrayIfNot<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function randomProperty<V>(obj: Record<string | number | symbol, V>): V {
  const keys = Object.keys(obj);
  const randomIndex = Math.floor(Math.random() * keys.length);
  const randomKey = keys[randomIndex] as keyof typeof obj;
  return obj[randomKey] as V;
}
