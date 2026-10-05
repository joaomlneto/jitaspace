import { describe, expect, it } from "@jest/globals";

import {
  hasEnoughIsk,
  hasEnoughLp,
  hasRequiredItems,
  sumOwnedQuantities,
} from "~/components/LPStore/purchasability";

const offer = {
  corporationId: 1,
  lpCost: 1000,
  iskCost: 500_000,
  requiredItems: [{ typeId: 100, quantity: 2 }],
};

describe("sumOwnedQuantities", () => {
  it("adds up every stack of a type, wherever it is", () => {
    const owned = sumOwnedQuantities([
      { type_id: 100, quantity: 3 },
      { type_id: 200, quantity: 1 },
      { type_id: 100, quantity: 4 },
    ]);
    expect(owned.get(100)).toBe(7);
    expect(owned.get(200)).toBe(1);
    expect(owned.get(300)).toBeUndefined();
  });
});

describe("hasEnoughLp", () => {
  it("compares against the offering corporation's balance", () => {
    expect(hasEnoughLp(offer, { 1: 1000 })).toBe(true);
    expect(hasEnoughLp(offer, { 1: 999 })).toBe(false);
  });

  it("does not count LP with another corporation", () => {
    expect(hasEnoughLp(offer, { 2: 5000 })).toBe(false);
  });

  it("ignores the AK cost, which ESI gives no balance for", () => {
    expect(
      hasEnoughLp({ ...offer, akCost: 50 } as typeof offer, { 1: 1000 }),
    ).toBe(true);
  });
});

describe("hasEnoughIsk", () => {
  it("compares against the wallet balance", () => {
    expect(hasEnoughIsk(offer, 500_000)).toBe(true);
    expect(hasEnoughIsk(offer, 499_999)).toBe(false);
    expect(hasEnoughIsk({ ...offer, iskCost: 0 }, 0)).toBe(true);
  });
});

describe("hasRequiredItems", () => {
  it("needs every required item in the required quantity", () => {
    expect(hasRequiredItems(offer, new Map([[100, 2]]))).toBe(true);
    expect(hasRequiredItems(offer, new Map([[100, 1]]))).toBe(false);
    expect(hasRequiredItems(offer, new Map())).toBe(false);
  });

  it("needs nothing for an offer without required items", () => {
    expect(hasRequiredItems({ ...offer, requiredItems: [] }, new Map())).toBe(
      true,
    );
  });
});
