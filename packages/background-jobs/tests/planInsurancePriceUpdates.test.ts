import { describe, expect, it } from "@jest/globals";

import type {
  InsurancePriceRow,
  InsurancePriceValues,
} from "../helpers/planInsurancePriceUpdates.ts";
import {
  parseInsurancePriceList,
  planInsurancePriceUpdates,
} from "../helpers/planInsurancePriceUpdates.ts";

const at = (hour: number) => new Date(Date.UTC(2026, 9, 10, hour));

/** Prices derived from one value, the way ESI's are. */
const prices = (value: number): InsurancePriceValues => ({
  basicCost: value * 0.1,
  basicPayout: value,
  standardCost: value * 0.2,
  standardPayout: value * 1.2,
  bronzeCost: value * 0.3,
  bronzePayout: value * 1.4,
  silverCost: value * 0.4,
  silverPayout: value * 1.6,
  goldCost: value * 0.5,
  goldPayout: value * 1.8,
  platinumCost: value * 0.6,
  platinumPayout: value * 2,
});

const row = (
  typeId: number,
  value: number,
  validFrom: Date,
  validUntil: Date | null,
): InsurancePriceRow => ({ typeId, validFrom, validUntil, ...prices(value) });

const list = (entries: Record<number, number>) =>
  new Map(
    Object.entries(entries).map(([typeId, value]) => [
      Number(typeId),
      prices(value),
    ]),
  );

describe("parseInsurancePriceList", () => {
  it("maps each level to its columns", () => {
    const parsed = parseInsurancePriceList([
      {
        type_id: 587,
        levels: [
          { name: "Basic", cost: 1, payout: 10 },
          { name: "Platinum", cost: 6, payout: 20 },
        ],
      },
    ]);
    expect(parsed.get(587)).toEqual({
      basicCost: 1,
      basicPayout: 10,
      standardCost: null,
      standardPayout: null,
      bronzeCost: null,
      bronzePayout: null,
      silverCost: null,
      silverPayout: null,
      goldCost: null,
      goldPayout: null,
      platinumCost: 6,
      platinumPayout: 20,
    });
  });

  it("rejects a level it cannot store, such as a localized name", () => {
    expect(() =>
      parseInsurancePriceList([
        { type_id: 587, levels: [{ name: "Basis", cost: 1, payout: 10 }] },
      ]),
    ).toThrow(/Unknown insurance level "Basis"/);
  });

  it("rejects a type or a level listed twice", () => {
    const levels = [{ name: "Basic", cost: 1, payout: 10 }];
    expect(() =>
      parseInsurancePriceList([
        { type_id: 587, levels },
        { type_id: 587, levels },
      ]),
    ).toThrow(/twice/);
    expect(() =>
      parseInsurancePriceList([
        { type_id: 587, levels: [...levels, ...levels] },
      ]),
    ).toThrow(/twice/);
  });
});

describe("planInsurancePriceUpdates, appending the latest observation", () => {
  const base = { nextObservedAt: null, startingAtNext: [] };

  it("starts open rows on the first observation ever", () => {
    const plan = planInsurancePriceUpdates({
      ...base,
      observedAt: at(1),
      prices: list({ 587: 100, 588: 200 }),
      containing: [],
    });
    expect(plan.create).toEqual([
      row(587, 100, at(1), null),
      row(588, 200, at(1), null),
    ]);
    expect(plan.closeTypeIds).toEqual([]);
    expect(plan.changedTypeIds).toEqual([587, 588]);
  });

  it("writes nothing when no price changed", () => {
    const plan = planInsurancePriceUpdates({
      ...base,
      observedAt: at(2),
      prices: list({ 587: 100 }),
      containing: [row(587, 100, at(1), null)],
    });
    expect(plan).toEqual({
      create: [],
      closeTypeIds: [],
      deleteAtNextTypeIds: [],
      changedTypeIds: [],
    });
  });

  it("ends a changed row and starts the new one", () => {
    const plan = planInsurancePriceUpdates({
      ...base,
      observedAt: at(2),
      prices: list({ 587: 100, 588: 250 }),
      containing: [row(587, 100, at(1), null), row(588, 200, at(1), null)],
    });
    expect(plan.closeTypeIds).toEqual([588]);
    expect(plan.create).toEqual([row(588, 250, at(2), null)]);
  });

  it("treats a change of a single level as a change", () => {
    const changed = list({ 587: 100 });
    changed.set(587, { ...prices(100), goldPayout: 181 });
    const plan = planInsurancePriceUpdates({
      ...base,
      observedAt: at(2),
      prices: changed,
      containing: [row(587, 100, at(1), null)],
    });
    expect(plan.changedTypeIds).toEqual([587]);
  });

  it("ends the row of a type no longer listed, and restarts it when relisted", () => {
    const unlisted = planInsurancePriceUpdates({
      ...base,
      observedAt: at(2),
      prices: list({}),
      containing: [row(587, 100, at(1), null)],
    });
    expect(unlisted.closeTypeIds).toEqual([587]);
    expect(unlisted.create).toEqual([]);

    const relisted = planInsurancePriceUpdates({
      ...base,
      observedAt: at(3),
      prices: list({ 587: 100 }),
      containing: [],
    });
    expect(relisted.create).toEqual([row(587, 100, at(3), null)]);
  });

  it("refuses two rows current at once for one type", () => {
    expect(() =>
      planInsurancePriceUpdates({
        ...base,
        observedAt: at(3),
        prices: list({}),
        containing: [row(587, 100, at(1), null), row(587, 200, at(2), null)],
      }),
    ).toThrow(/Two containing/);
  });
});

describe("planInsurancePriceUpdates, filling a gap", () => {
  it("records nothing but the snapshot when the gap saw the same prices", () => {
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 100 }),
      containing: [row(587, 100, at(1), at(3))],
      nextObservedAt: at(3),
      startingAtNext: [row(587, 200, at(3), null)],
    });
    expect(plan.changedTypeIds).toEqual([]);
  });

  it("moves a change earlier when the gap already saw the new prices", () => {
    // Observed 100 at 1:00 and 200 at 3:00; 2:00 saw 200 too.
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 200 }),
      containing: [row(587, 100, at(1), at(3))],
      nextObservedAt: at(3),
      startingAtNext: [row(587, 200, at(3), null)],
    });
    expect(plan.closeTypeIds).toEqual([587]);
    expect(plan.deleteAtNextTypeIds).toEqual([587]);
    expect(plan.create).toEqual([row(587, 200, at(2), null)]);
  });

  it("inserts prices only the gap saw", () => {
    // Observed 100 at 1:00 and 200 at 3:00; 2:00 saw 150.
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 150 }),
      containing: [row(587, 100, at(1), at(3))],
      nextObservedAt: at(3),
      startingAtNext: [row(587, 200, at(3), null)],
    });
    expect(plan.closeTypeIds).toEqual([587]);
    expect(plan.deleteAtNextTypeIds).toEqual([]);
    expect(plan.create).toEqual([row(587, 150, at(2), at(3))]);
  });

  it("splits a row whose prices the gap saw differ from", () => {
    // Observed 100 at 1:00 and at 3:00; 2:00 saw 150.
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 150 }),
      containing: [row(587, 100, at(1), null)],
      nextObservedAt: at(3),
      startingAtNext: [],
    });
    expect(plan.closeTypeIds).toEqual([587]);
    expect(plan.create).toEqual([
      row(587, 150, at(2), at(3)),
      row(587, 100, at(3), null),
    ]);
  });

  it("splits a row around a gap that did not list the type", () => {
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({}),
      containing: [row(587, 100, at(1), at(5))],
      nextObservedAt: at(3),
      startingAtNext: [],
    });
    expect(plan.closeTypeIds).toEqual([587]);
    expect(plan.create).toEqual([row(587, 100, at(3), at(5))]);
  });

  it("starts a type earlier when the gap listed it first", () => {
    // Unlisted at 1:00, listed with 100 from 3:00; 2:00 listed it already.
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 100 }),
      containing: [],
      nextObservedAt: at(3),
      startingAtNext: [row(587, 100, at(3), at(4))],
    });
    expect(plan.deleteAtNextTypeIds).toEqual([587]);
    expect(plan.create).toEqual([row(587, 100, at(2), at(4))]);
  });

  it("adds a row for a type listed only during the gap", () => {
    const plan = planInsurancePriceUpdates({
      observedAt: at(2),
      prices: list({ 587: 100 }),
      containing: [],
      nextObservedAt: at(3),
      startingAtNext: [],
    });
    expect(plan.create).toEqual([row(587, 100, at(2), at(3))]);
  });

  it("fills a gap before the first observation", () => {
    const plan = planInsurancePriceUpdates({
      observedAt: at(0),
      prices: list({ 587: 100 }),
      containing: [],
      nextObservedAt: at(1),
      startingAtNext: [row(587, 100, at(1), null)],
    });
    expect(plan.deleteAtNextTypeIds).toEqual([587]);
    expect(plan.create).toEqual([row(587, 100, at(0), null)]);
  });
});
