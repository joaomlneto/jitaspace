/**
 * Plain helpers about corporation ids, safe to import from client code (the
 * page's `data.ts` pulls in Prisma).
 */

/** Tag on one corporation's database read and its ESI card. */
export const corporationCacheTag = (corporationId: number) =>
  `corporation:${corporationId}`;
