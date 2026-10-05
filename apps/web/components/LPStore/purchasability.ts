/** The parts of an LP store offer that decide whether you can buy it. */
export interface OfferCosts {
  corporationId: number;
  lpCost: number;
  iskCost: number;
  requiredItems: readonly { typeId: number; quantity: number }[];
}

/** Units owned per type id, summed across every asset (any location). */
export function sumOwnedQuantities(
  assets: Iterable<{ type_id: number; quantity: number }>,
): Map<number, number> {
  const owned = new Map<number, number>();
  for (const { type_id, quantity } of assets) {
    owned.set(type_id, (owned.get(type_id) ?? 0) + quantity);
  }
  return owned;
}

/**
 * Enough LP with the offering corporation. `loyaltyPoints` is LP per
 * corporation id; ESI omits zero balances, so a missing id is 0. The offer's AK
 * cost is not checked, as ESI does not report AK balances.
 */
export function hasEnoughLp(
  offer: OfferCosts,
  loyaltyPoints: Readonly<Record<number, number>>,
): boolean {
  return (loyaltyPoints[offer.corporationId] ?? 0) >= offer.lpCost;
}

/** Enough ISK in the wallet. */
export function hasEnoughIsk(offer: OfferCosts, isk: number): boolean {
  return isk >= offer.iskCost;
}

/**
 * Every required item owned in the required quantity. Items count wherever
 * they are, though the game wants them in the hangar of the station you redeem
 * at.
 */
export function hasRequiredItems(
  offer: OfferCosts,
  ownedQuantities: ReadonlyMap<number, number>,
): boolean {
  return offer.requiredItems.every(
    ({ typeId, quantity }) => (ownedQuantities.get(typeId) ?? 0) >= quantity,
  );
}
