// Stolen from Prisma:
// see https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
export function excludeObjectKeys<T extends object>(
  record: T,
  keys: string[],
): any {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !keys.includes(key)),
  );
}
