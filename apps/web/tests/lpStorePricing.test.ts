import { describe, expect, it } from "@jest/globals";

import type { FuzzworkTypeMarketAggregate } from "@jitaspace/hooks";

import type { AugmentedOffer } from "../components/LPStore/pricing";
import {
  buyIskPerLp,
  buyProfit,
  requiredItemsBuyCost,
  requiredItemsSellCost,
  requiredItemsSplitCost,
  rewardBuyValue,
  rewardSellValue,
  rewardSplitValue,
  sellIskPerLp,
  sellProfit,
} from "../components/LPStore/pricing";

// Minimal aggregate where only the buy/sell percentile matters to the pricing
// helpers; the remaining stats are filled with the same value for brevity.
function stats(buy: number, sell: number): FuzzworkTypeMarketAggregate {
  const side = (percentile: number) => ({
    percentile,
    volume: 0,
    weightedAverage: percentile,
    max: percentile,
    stddev: 0,
    median: percentile,
    orderCount: 0,
  });
  return { buy: side(buy), sell: side(sell) };
}

function offer(overrides: Partial<AugmentedOffer> = {}): AugmentedOffer {
  return {
    offerId: 1,
    corporationId: 1,
    typeId: 100,
    quantity: 1,
    akCost: null,
    lpCost: 100,
    iskCost: 50,
    requiredItems: [],
    typeName: "Reward",
    corporationName: "Corp",
    marketStats: undefined,
    ...overrides,
  };
}

describe("LP store pricing — reward value accounts for quantity", () => {
  it("prices a single-unit reward at the unit price", () => {
    const o = offer({ quantity: 1, marketStats: stats(1000, 1200) });
    expect(rewardSellValue(o)).toBe(1200);
    expect(rewardBuyValue(o)).toBe(1000);
    expect(rewardSplitValue(o)).toBe(1100);
  });

  it("multiplies the reward value by the quantity granted", () => {
    const o = offer({ quantity: 5000, marketStats: stats(2025, 2100) });
    // The headline bug: a 5000-unit ammo stack must be valued as 5000 × unit,
    // not as a single unit.
    expect(rewardSellValue(o)).toBe(2100 * 5000);
    expect(rewardBuyValue(o)).toBe(2025 * 5000);
    expect(rewardSplitValue(o)).toBe(((2025 + 2100) / 2) * 5000);
  });

  it("returns undefined when the reward is unpriced", () => {
    const o = offer({ quantity: 10, marketStats: undefined });
    expect(rewardSellValue(o)).toBeUndefined();
    expect(rewardBuyValue(o)).toBeUndefined();
    expect(rewardSplitValue(o)).toBeUndefined();
  });
});

describe("LP store pricing — required items priced per-unit × quantity", () => {
  it("sums each required item's price times its quantity", () => {
    const o = offer({
      requiredItems: [
        { typeId: 200, quantity: 2, marketStats: stats(10, 20) },
        { typeId: 300, quantity: 3, marketStats: stats(100, 200) },
      ],
    });
    expect(requiredItemsSellCost(o)).toBe(20 * 2 + 200 * 3);
    expect(requiredItemsBuyCost(o)).toBe(10 * 2 + 100 * 3);
    expect(requiredItemsSplitCost(o)).toBe(15 * 2 + 150 * 3);
  });

  it("treats unpriced required items as zero cost", () => {
    const o = offer({
      requiredItems: [{ typeId: 200, quantity: 5, marketStats: undefined }],
    });
    expect(requiredItemsSellCost(o)).toBe(0);
    expect(requiredItemsBuyCost(o)).toBe(0);
    expect(requiredItemsSplitCost(o)).toBe(0);
  });
});

describe("LP store pricing — profit and ISK/LP", () => {
  it("computes profit as reward stack value minus required-items cost", () => {
    const o = offer({
      quantity: 5,
      marketStats: stats(1000, 1200),
      requiredItems: [{ typeId: 200, quantity: 2, marketStats: stats(10, 20) }],
    });
    expect(sellProfit(o)).toBe(1200 * 5 - 20 * 2);
    expect(buyProfit(o)).toBe(1000 * 5 - 10 * 2);
  });

  it("turns a multi-unit ammo offer profitable once quantity is applied", () => {
    // Real Caldari Navy shape (offer 3587): 5000× reward, 5500 LP, 5.5M ISK,
    // 5000× base charge required. Pre-fix this evaluated to ~ -1,402 ISK/LP.
    const o = offer({
      quantity: 5000,
      lpCost: 5500,
      iskCost: 5_500_000,
      marketStats: stats(2025, 2100),
      requiredItems: [
        { typeId: 2506, quantity: 5000, marketStats: stats(360, 442) },
      ],
    });
    const expected = (2100 * 5000 - 5_500_000 - 442 * 5000) / 5500;
    expect(sellIskPerLp(o)).toBeCloseTo(expected, 6);
    expect(sellIskPerLp(o)).toBeGreaterThan(0);
  });

  it("computes sell and buy ISK/LP net of ISK cost and required items", () => {
    const o = offer({
      quantity: 1,
      lpCost: 100,
      iskCost: 50,
      marketStats: stats(1000, 1200),
      requiredItems: [{ typeId: 200, quantity: 2, marketStats: stats(10, 20) }],
    });
    expect(sellIskPerLp(o)).toBeCloseTo((1200 - 50 - 20 * 2) / 100, 6);
    expect(buyIskPerLp(o)).toBeCloseTo((1000 - 50 - 10 * 2) / 100, 6);
  });

  it("returns undefined ISK/LP for zero-LP (item-exchange) offers", () => {
    const o = offer({ lpCost: 0, marketStats: stats(1000, 1200) });
    expect(sellIskPerLp(o)).toBeUndefined();
    expect(buyIskPerLp(o)).toBeUndefined();
  });

  it("falls back to zero reward value when unpriced", () => {
    const o = offer({ lpCost: 100, iskCost: 50, marketStats: undefined });
    expect(sellProfit(o)).toBe(0);
    expect(buyProfit(o)).toBe(0);
    expect(sellIskPerLp(o)).toBeCloseTo(-50 / 100, 6);
  });
});
