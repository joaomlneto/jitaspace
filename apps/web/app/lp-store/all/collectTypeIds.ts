/**
 * Collect the distinct type IDs that need market prices for a set of LP store
 * offers: both the reward items (`offer.typeId`) and the required items.
 *
 * The reward items were previously omitted on the "all offers" page, so the
 * table couldn't price them and its ISK/LP ranking didn't match the
 * per-corporation pages (issue #455).
 */
export function collectLpStoreOfferTypeIds(
  offers: { typeId: number }[],
  requiredItems: { typeId: number }[],
): number[] {
  return [
    ...new Set([
      ...offers.map((offer) => offer.typeId),
      ...requiredItems.map((item) => item.typeId),
    ]),
  ];
}
