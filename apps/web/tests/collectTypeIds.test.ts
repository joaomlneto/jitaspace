import { describe, expect, it } from "@jest/globals";

import { collectLpStoreOfferTypeIds } from "~/app/lp-store/all/collectTypeIds";

describe("collectLpStoreOfferTypeIds", () => {
  it("includes both reward item and required item type ids", () => {
    const result = collectLpStoreOfferTypeIds(
      [{ typeId: 100 }, { typeId: 200 }],
      [{ typeId: 34 }, { typeId: 35 }],
    );
    expect([...result].sort((a, b) => a - b)).toEqual([34, 35, 100, 200]);
  });

  it("de-duplicates ids shared between reward and required items", () => {
    const result = collectLpStoreOfferTypeIds(
      [{ typeId: 100 }, { typeId: 100 }],
      [{ typeId: 100 }, { typeId: 200 }],
    );
    expect([...result].sort((a, b) => a - b)).toEqual([100, 200]);
  });

  it("returns an empty array when there are no offers", () => {
    expect(collectLpStoreOfferTypeIds([], [])).toEqual([]);
  });
});
