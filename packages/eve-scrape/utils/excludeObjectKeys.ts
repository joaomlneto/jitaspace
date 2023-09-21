// Stolen from Prisma:
// see https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
export function excludeObjectKeys<T extends object, Key extends keyof T>(
  record: T,
  keys: Key[],
): Omit<T, Key> {
  // @ts-expect-error idk why
  return Object.fromEntries(
    // @ts-expect-error idk why
    Object.entries(record).filter(([key]) => !keys.includes(key)),
  );
}
