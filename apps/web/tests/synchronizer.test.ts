import { describe, expect, it } from "@jest/globals";

import {
  emptyTypeSynchronizer,
  hasSynchronizer,
  operatorDirection,
  perModuleAmount,
  skillAdjustedValue,
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

  it("starts from the rig's own counter value", () => {
    expect(synchronizerCounter(modules(1), 3, 2)).toBe(5);
  });
});

describe("expansion notes: a flat 1% for every matching module", () => {
  // Imperial Navy Synchronizer, as listed: 5% Energy Turret damage, a 5%
  // reduction in their capacitor use (stored as -5, modSub), 5% armor HP and
  // 5% capacitor. Every matching module adds 1 to every counter.
  const counter = (fitted: number) => synchronizerCounter(modules(1), fitted);

  it("grows each listed bonus by one percentage point per module", () => {
    expect(synchronizedValue(5, counter(1))).toBe(6);
    expect(synchronizedValue(5, counter(8))).toBe(13);
  });

  it("grows the capacitor use reduction the same way", () => {
    expect(synchronizedValue(-5, counter(1), -1)).toBe(-6);
    expect(synchronizerTrend(-5, 1, -1)).toBe("grows");
  });
});

describe("skillAdjustedValue", () => {
  // Expansion notes: "Each level of the skill grants a 10% reduction in
  // synchronizer rig CPU penalty". The SDE stores the drawback as -10 and the
  // skill's rigDrawbackBonus as -10 per level, applied as a PostPercent.
  it("takes 10% of the CPU drawback off per level of Synchronization Rigging", () => {
    expect(
      [0, 1, 2, 3, 4, 5].map((level) =>
        Number(skillAdjustedValue(-10, -10, level).toFixed(6)),
      ),
    ).toEqual([-10, -9, -8, -7, -6, -5]);
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
