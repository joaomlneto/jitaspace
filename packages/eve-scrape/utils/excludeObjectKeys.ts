// Stolen from Prisma:
// see https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
export function excludeObjectKeys<T extends object, K extends keyof T>(
  record: T,
  keys: K[],
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}
