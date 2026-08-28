import { describe, expect, it } from "@jest/globals";

import type { LpStoreOffer } from "~/app/lp-store/all/encoding";
import { decodeOffer, encodeOffer } from "~/app/lp-store/all/encoding";

const OFFER: LpStoreOffer = {
  offerId: 1,
  corporationId: 1000035,
  typeId: 2929,
  quantity: 1,
  akCost: null,
  lpCost: 1500,
  iskCost: 5_000_000,
  requiredItems: [
    { typeId: 34, quantity: 10 },
    { typeId: 35, quantity: 20 },
  ],
};

describe("LP store offer encoding", () => {
  it("round-trips an offer unchanged", () => {
    expect(decodeOffer(encodeOffer(OFFER))).toEqual(OFFER);
  });

  it("round-trips an offer with no required items", () => {
    const bare: LpStoreOffer = { ...OFFER, requiredItems: [] };
    expect(decodeOffer(encodeOffer(bare))).toEqual(bare);
  });

  it("preserves a null akCost rather than coercing it", () => {
    // akCost is nullable in the schema and 0 is a legitimate value, so the
    // encoding must keep the two distinguishable.
    expect(decodeOffer(encodeOffer({ ...OFFER, akCost: null })).akCost).toBeNull();
    expect(decodeOffer(encodeOffer({ ...OFFER, akCost: 0 })).akCost).toBe(0);
  });

  it("survives a JSON round-trip, which is what the RSC payload does", () => {
    const wire = JSON.parse(
      JSON.stringify(encodeOffer(OFFER)),
    ) as ReturnType<typeof encodeOffer>;
    expect(decodeOffer(wire)).toEqual(OFFER);
  });

  it("is materially smaller on the wire than the object form", () => {
    const asObject = JSON.stringify(OFFER).length;
    const asTuple = JSON.stringify(encodeOffer(OFFER)).length;

    // The whole point: repeated key names were 75% of this page's 7.9 MB
    // payload. Guard the property, not a specific ratio.
    expect(asTuple).toBeLessThan(asObject / 2);
  });
});
