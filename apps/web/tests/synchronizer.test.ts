import { describe, expect, it } from "@jest/globals";

import {
  emptyTypeSynchronizer,
  hasSynchronizer,
  operatorDirection,
  perModuleAmount,
  synchronizedValue,
  synchronizerCounter,
  synchronizerTrend,
  synchronizerZeroAt,
} from "~/lib/synchronizer";

const modules = (...amounts: number[]) => amounts.map((amount) => ({ amount }));

describe("perModuleAmount", () => {
  it("is what every module adds when they agree", () => {
    expect(perModuleAmount(modules(1, 1, 1))).toBe(1);
  });

  it("takes the most common amount when they do not", () => {
    expect(perModuleAmount(modules(2, 1, 2))).toBe(2);
  });

  it("is 1 for a rig no module feeds", () => {
    expect(perModuleAmount([])).toBe(1);
  });
});

describe("synchronizerCounter", () => {
  it("adds one module's amount per module", () => {
    expect(synchronizerCounter(modules(1, 1), 6)).toBe(6);
    expect(synchronizerCounter(modules(1, 1), 0)).toBe(0);
  });
});

describe("synchronizedValue", () => {
  it("adds the counter to the rig's own value", () => {
    // Large Caldari Navy Synchronizer: 5% missile damage, 4 modules → 9%.
    expect(synchronizedValue(5, 4)).toBe(9);
  });

  it("subtracts it from a reduction the rig subtracts from", () => {
    // Dread Guristas: -5% EM resistance bonus (modSub), 3 modules → -8%.
    expect(synchronizedValue(-5, 3, -1)).toBe(-8);
  });
});

describe("operatorDirection", () => {
  it("maps modAdd and modSub, and nothing else", () => {
    expect(operatorDirection(2)).toBe(1);
    expect(operatorDirection(3)).toBe(-1);
    expect(operatorDirection(6)).toBeNull();
    expect(operatorDirection(null)).toBeNull();
  });
});

describe("synchronizerTrend", () => {
  it("grows a positive bonus", () => {
    expect(synchronizerTrend(5, 1)).toBe("grows");
  });

  it("grows a reduction the rig subtracts from", () => {
    expect(synchronizerTrend(-10, 1, -1)).toBe("grows");
  });

  it("shrinks a reduction the rig adds to", () => {
    expect(synchronizerTrend(-10, 1, 1)).toBe("shrinks");
  });

  it("treats a zero base as growing", () => {
    expect(synchronizerTrend(0, 1)).toBe("grows");
  });
});

describe("synchronizerZeroAt", () => {
  it("is when a shrinking reduction reaches zero", () => {
    expect(synchronizerZeroAt(-10, 1)).toBe(10);
    expect(synchronizerZeroAt(-5, 2)).toBe(3);
  });

  it("is null for a bonus that grows", () => {
    expect(synchronizerZeroAt(5, 1)).toBeNull();
    expect(synchronizerZeroAt(-5, 1, -1)).toBeNull();
  });
});

describe("hasSynchronizer", () => {
  it("is false for most types", () => {
    expect(hasSynchronizer(emptyTypeSynchronizer)).toBe(false);
  });

  it("is true for a module that powers a rig", () => {
    expect(
      hasSynchronizer({
        rig: null,
        countsTowards: [
          {
            typeId: 96139,
            name: "Small Caldari Navy Synchronizer",
            counterName: "Caldari Navy Modules Fitted",
            amount: 1,
          },
        ],
      }),
    ).toBe(true);
  });
});
