/**
 * Plain helpers about corporation ids, safe to import from client code (the
 * page's `data.ts` pulls in Prisma).
 */

/** NPC corporations hold the ids 1,000,000–1,999,999; players are above. */
export const isNpcCorporationId = (corporationId: number) =>
  corporationId >= 1_000_000 && corporationId < 2_000_000;

/** Tag on one corporation's database read and its ESI card. */
export const corporationCacheTag = (corporationId: number) =>
  `corporation:${corporationId}`;
