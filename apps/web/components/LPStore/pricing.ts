import type { FuzzworkTypeMarketAggregate } from "@jitaspace/hooks";

/**
 * An LP store offer augmented with Jita market aggregates for its reward item
 * and each of its required items.
 */
export interface AugmentedOffer {
  offerId: number;
  corporationId: number;
  typeId: number;
  quantity: number;
  akCost: number | null;
  lpCost: number;
  iskCost: number;
  requiredItems: {
    typeId: number;
    quantity: number;
    // Display-only, resolved on the server and threaded through by the table so
    // required-item names render without per-row name hooks. The pricing helpers
    // below never read it, so it is optional for non-display callers.
    typeName?: string;
    marketStats?: FuzzworkTypeMarketAggregate;
  }[];
  typeName: string | undefined;
  corporationName: string | undefined;
  marketStats?: FuzzworkTypeMarketAggregate;
}

// ---------------------------------------------------------------------------
// Reward value
//
// An offer grants `quantity` units of the reward item, so the value of what you
// receive is the per-unit Jita price times the quantity. Forgetting to multiply
// by the quantity made every multi-unit offer — most notably ammunition, which
// is sold in lots of up to 5000 — look like a guaranteed loss, because the
// required items WERE priced per-unit × quantity while the reward was counted as
// a single unit. The reward value is `undefined` (not 0) when the item is
// unpriced, so price columns render blank rather than "0 ISK".
// ---------------------------------------------------------------------------

export function rewardSellValue(offer: AugmentedOffer): number | undefined {
  return offer.marketStats === undefined
    ? undefined
    : offer.marketStats.sell.percentile * offer.quantity;
}

export function rewardBuyValue(offer: AugmentedOffer): number | undefined {
  return offer.marketStats === undefined
    ? undefined
    : offer.marketStats.buy.percentile * offer.quantity;
}

export function rewardSplitValue(offer: AugmentedOffer): number | undefined {
  return offer.marketStats === undefined
    ? undefined
    : ((offer.marketStats.buy.percentile + offer.marketStats.sell.percentile) /
        2) *
        offer.quantity;
}

// ---------------------------------------------------------------------------
// Required-items cost — the market value of the items you must hand in, each
// priced per-unit × quantity. Unpriced items contribute 0.
// ---------------------------------------------------------------------------

export function requiredItemsSellCost(offer: AugmentedOffer): number {
  return offer.requiredItems.reduce(
    (sum, item) =>
      sum + (item.marketStats?.sell.percentile ?? 0) * item.quantity,
    0,
  );
}

export function requiredItemsBuyCost(offer: AugmentedOffer): number {
  return offer.requiredItems.reduce(
    (sum, item) =>
      sum + (item.marketStats?.buy.percentile ?? 0) * item.quantity,
    0,
  );
}

export function requiredItemsSplitCost(offer: AugmentedOffer): number {
  return offer.requiredItems.reduce(
    (sum, item) =>
      sum +
      (((item.marketStats?.buy.percentile ?? 0) +
        (item.marketStats?.sell.percentile ?? 0)) /
        2) *
        item.quantity,
    0,
  );
}

// ---------------------------------------------------------------------------
// Profit — reward value minus the cost of the required items, valued on the
// same side of the order book.
// ---------------------------------------------------------------------------

export function sellProfit(offer: AugmentedOffer): number {
  return (rewardSellValue(offer) ?? 0) - requiredItemsSellCost(offer);
}

export function buyProfit(offer: AugmentedOffer): number {
  return (rewardBuyValue(offer) ?? 0) - requiredItemsBuyCost(offer);
}

// ---------------------------------------------------------------------------
// ISK per loyalty point — the net ISK gained (reward value minus ISK cost and
// required items) divided by the LP spent. Returns `undefined` for offers with
// no LP cost (e.g. item-exchange offers) so the column stays blank instead of
// dividing by zero into Infinity.
// ---------------------------------------------------------------------------

export function sellIskPerLp(offer: AugmentedOffer): number | undefined {
  if (offer.lpCost <= 0) return undefined;
  return (
    ((rewardSellValue(offer) ?? 0) -
      offer.iskCost -
      requiredItemsSellCost(offer)) /
    offer.lpCost
  );
}

export function buyIskPerLp(offer: AugmentedOffer): number | undefined {
  if (offer.lpCost <= 0) return undefined;
  return (
    ((rewardBuyValue(offer) ?? 0) -
      offer.iskCost -
      requiredItemsBuyCost(offer)) /
    offer.lpCost
  );
}
