/**
 * Positional encoding for the "all LP store offers" payload.
 *
 * This page hands ~33,000 offers from a server component to a client one, which
 * means every offer is serialized twice: once into the rendered HTML and again
 * into the RSC flight payload the browser parses to hydrate. Measured against
 * production before this existed, the document was 7.9 MB and **75% of the
 * flight payload was repeated JSON key names** — `"corporationId":` alone
 * appeared 69,192 times, `"typeId":` 72,443. The numbers themselves were only
 * about 2 MB of it.
 *
 * Tuples carry the same numbers without the keys. Nothing else changes: the
 * client decodes them back into objects before rendering, so
 * `LoyaltyPointsTable` still receives exactly the shape it always did.
 *
 * The labelled tuple elements below are the documentation — read them as the
 * column order, and change `encodeOffer`/`decodeOffer` together if it ever
 * moves.
 */

/** `[typeId, quantity]` — what an offer costs in items, besides ISK and LP. */
export type EncodedRequiredItem = [typeId: number, quantity: number];

export type EncodedOffer = [
  offerId: number,
  corporationId: number,
  typeId: number,
  quantity: number,
  akCost: number | null,
  lpCost: number,
  iskCost: number,
  requiredItems: EncodedRequiredItem[],
];

/** The decoded shape, i.e. what `LoyaltyPointsTable` consumes. */
export interface LpStoreOffer {
  offerId: number;
  corporationId: number;
  typeId: number;
  quantity: number;
  akCost: number | null;
  lpCost: number;
  iskCost: number;
  requiredItems: { typeId: number; quantity: number }[];
}

export function encodeOffer(offer: LpStoreOffer): EncodedOffer {
  return [
    offer.offerId,
    offer.corporationId,
    offer.typeId,
    offer.quantity,
    offer.akCost,
    offer.lpCost,
    offer.iskCost,
    offer.requiredItems.map((item) => [item.typeId, item.quantity]),
  ];
}

export function decodeOffer(offer: EncodedOffer): LpStoreOffer {
  const [
    offerId,
    corporationId,
    typeId,
    quantity,
    akCost,
    lpCost,
    iskCost,
    requiredItems,
  ] = offer;
  return {
    offerId,
    corporationId,
    typeId,
    quantity,
    akCost,
    lpCost,
    iskCost,
    requiredItems: requiredItems.map(([itemTypeId, itemQuantity]) => ({
      typeId: itemTypeId,
      quantity: itemQuantity,
    })),
  };
}
