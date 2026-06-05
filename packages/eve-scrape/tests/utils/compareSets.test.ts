import { describe, expect, it } from "@jest/globals";

jest.mock("inngest", () => ({
  NonRetriableError: class NonRetriableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NonRetriableError";
    }
  },
}));
jest.mock("../../env", () => ({ env: { NODE_ENV: "test" } }));

import { compareSets } from "../../utils/compareSets";

type Item = { id: number; name: string };

const getId = (item: Item) => item.id;
const isEqual = (a: Item, b: Item) => a.name === b.name;

describe("compareSets", () => {
  it("correctly classifies all records as equal when before === after", () => {
    const records: Item[] = [
      { id: 1, name: "alpha" },
      { id: 2, name: "beta" },
    ];
    const result = compareSets({
      recordsBefore: records,
      recordsAfter: records,
      getId,
      recordsAreEqual: isEqual,
    });
    expect(result.equal).toHaveLength(2);
    expect(result.created).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  it("detects newly created records (in after but not in before)", () => {
    const before: Item[] = [{ id: 1, name: "alpha" }];
    const after: Item[] = [
      { id: 1, name: "alpha" },
      { id: 2, name: "beta" },
    ];
    const result = compareSets({
      recordsBefore: before,
      recordsAfter: after,
      getId,
      recordsAreEqual: isEqual,
    });
    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toEqual({ id: 2, name: "beta" });
    expect(result.equal).toHaveLength(1);
    expect(result.deleted).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  it("detects deleted records (in before but not in after)", () => {
    const before: Item[] = [
      { id: 1, name: "alpha" },
      { id: 2, name: "beta" },
    ];
    const after: Item[] = [{ id: 1, name: "alpha" }];
    const result = compareSets({
      recordsBefore: before,
      recordsAfter: after,
      getId,
      recordsAreEqual: isEqual,
    });
    expect(result.deleted).toHaveLength(1);
    expect(result.deleted[0]).toEqual({ id: 2, name: "beta" });
    expect(result.equal).toHaveLength(1);
    expect(result.created).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  it("detects modified records (same ID but different field value)", () => {
    const before: Item[] = [{ id: 1, name: "alpha" }];
    const after: Item[] = [{ id: 1, name: "alpha-modified" }];
    const result = compareSets({
      recordsBefore: before,
      recordsAfter: after,
      getId,
      recordsAreEqual: isEqual,
    });
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0]).toEqual({ id: 1, name: "alpha-modified" });
    expect(result.equal).toHaveLength(0);
    expect(result.created).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  it("handles mixed: some created, deleted, equal, modified in a single call", () => {
    const before: Item[] = [
      { id: 1, name: "unchanged" },
      { id: 2, name: "will-change" },
      { id: 3, name: "will-delete" },
    ];
    const after: Item[] = [
      { id: 1, name: "unchanged" },
      { id: 2, name: "changed" },
      { id: 4, name: "new-record" },
    ];
    const result = compareSets({
      recordsBefore: before,
      recordsAfter: after,
      getId,
      recordsAreEqual: isEqual,
    });
    expect(result.equal).toHaveLength(1);
    expect(result.equal[0]).toEqual({ id: 1, name: "unchanged" });
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0]).toEqual({ id: 2, name: "changed" });
    expect(result.deleted).toHaveLength(1);
    expect(result.deleted[0]).toEqual({ id: 3, name: "will-delete" });
    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toEqual({ id: 4, name: "new-record" });
  });

  it("throws NonRetriableError when count sanity check fails", () => {
    // Duplicate IDs in recordsBefore make the deleted array double-count:
    // both records with id=1 pass the "not in keysAfter" filter, producing
    // deleted.length=2, while the unique union of IDs is 2 (ids 1 and 2),
    // so numOutputs (3) !== numInputs (2) and the sanity check fires.
    const before: Item[] = [
      { id: 1, name: "a" },
      { id: 1, name: "a-dup" }, // duplicate id
    ];
    const after: Item[] = [{ id: 2, name: "b" }];
    expect(() =>
      compareSets({
        recordsBefore: before,
        recordsAfter: after,
        getId,
        recordsAreEqual: isEqual,
      }),
    ).toThrow("compareSets: input and output length do not match");
  });
});
