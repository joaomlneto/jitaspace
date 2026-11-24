import { describe, expect, it } from "@jest/globals";

import {
  toTypeAttributeRows,
  typePhysicalAttributes,
} from "../jobs/scrape/sde/typeDogmaTransforms";

/**
 * ESI's `/universe/types/{id}` listed mass, capacity, volume and radius among a
 * dogma type's attributes; typeDogma.yaml does not. With ESI gone at
 * compatibility date 2026-11-19, the ingest builds them from types.yaml. The
 * fixtures are real records (abridged) next to what ESI returned for them.
 */
describe("typePhysicalAttributes", () => {
  it("reads the four attributes off the type, defaulting as ESI did", () => {
    const physical = typePhysicalAttributes({
      // Rifter: every field present.
      587: { mass: 1067000, capacity: 140, volume: 27289, radius: 31 },
      // A skill (2073): only a volume, so ESI reported mass 0, capacity 0 and
      // radius 1.
      2073: { volume: 0.005 },
    });

    expect(physical.get(587)).toEqual(
      new Map([
        [4, 1067000],
        [38, 140],
        [161, 27289],
        [162, 31],
      ]),
    );
    expect(physical.get(2073)).toEqual(
      new Map([
        [4, 0],
        [38, 0],
        [161, 0.005],
        [162, 1],
      ]),
    );
  });
});

describe("toTypeAttributeRows", () => {
  const physical = new Map([
    [4, 1067000],
    [38, 140],
    [161, 27289],
    [162, 31],
  ]);

  it("adds the physical attributes to the listed ones", () => {
    const rows = toTypeAttributeRows(
      587,
      { dogmaAttributes: [{ attributeID: 9, value: 350 }] },
      physical,
    );

    expect(rows).toEqual([
      { typeId: 587, attributeId: 9, value: 350, isDeleted: false },
      { typeId: 587, attributeId: 4, value: 1067000, isDeleted: false },
      { typeId: 587, attributeId: 38, value: 140, isDeleted: false },
      { typeId: 587, attributeId: 161, value: 27289, isDeleted: false },
      { typeId: 587, attributeId: 162, value: 31, isDeleted: false },
    ]);
  });

  it("keeps typeDogma.yaml's value where both have one", () => {
    const rows = toTypeAttributeRows(
      587,
      { dogmaAttributes: [{ attributeID: 4, value: 5 }] },
      physical,
    );

    expect(rows.filter((row) => row.attributeId === 4)).toEqual([
      { typeId: 587, attributeId: 4, value: 5, isDeleted: false },
    ]);
    expect(rows).toHaveLength(4);
  });

  it("adds nothing for a type missing from types.yaml", () => {
    expect(toTypeAttributeRows(1, {}, undefined)).toEqual([]);
  });
});
