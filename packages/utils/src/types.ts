export function toArrayIfNot<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function randomProperty(obj: object) {
  var keys = Object.keys(obj);
  // @ts-ignore
  return obj[keys[(keys.length * Math.random()) << 0]];
}
