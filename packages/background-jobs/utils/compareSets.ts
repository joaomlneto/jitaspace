import { NonRetriableError } from "../core/errors";
import { env } from "../env";

export const compareSets = <T extends object>({
  recordsBefore,
  recordsAfter,
  getId,
  recordsAreEqual,
}: {
  recordsBefore: T[];
  recordsAfter: T[];
  getId: (t: T) => string | number;
  recordsAreEqual: (a: T, b: T) => boolean;
}) => {
  const keysBefore = recordsBefore.map((record) => getId(record));
  const keysAfter = recordsAfter.map((record) => getId(record));

  // Membership is tested against sets, not the key arrays. `Set.prototype.has`
  // and `Array.prototype.includes` both use SameValueZero, so this is an exact
  // swap for the linear scans — and it must stay a set keyed on `getId`'s own
  // values rather than `indexBefore`, whose plain-object keys would both coerce
  // 1 and "1" together and report inherited names like `constructor` as present.
  //
  // What they replace is three O(n*m) scans. `ingestSdeCompositeTable` chunks
  // by parent id (5000 at a time), which bounds parents but NOT rows, so the
  // widest typeDogma chunk carries 148,292 TypeAttribute rows: one call on it
  // measured 175.9s before and 0.09s after, and the table's six chunks together
  // account for ~618s of the job's 1800s ceiling. Keep membership O(1) — the
  // row count per chunk is set by SDE fan-out, not by anything we cap here.
  const keySetBefore = new Set(keysBefore);
  const keySetAfter = new Set(keysAfter);

  const indexBefore: Record<string | number | symbol, T> = {};
  recordsBefore.forEach((record) => (indexBefore[getId(record)] = record));

  // determine which records were created
  const created: T[] = recordsAfter.filter(
    (record) => !keySetBefore.has(getId(record)),
  );

  // determine which records were deleted
  const deleted = recordsBefore.filter(
    (record) => !keySetAfter.has(getId(record)),
  );

  // validate that object keys are the same
  if (env.NODE_ENV === "development") {
    const objKeysBefore = [
      ...new Set(recordsBefore.flatMap((record) => Object.keys(record))),
    ].filter(
      (key) =>
        key !== "updatedAt" && key !== "createdAt" && key !== "isDeleted",
    );
    const objKeysAfter = [
      ...new Set(recordsAfter.flatMap((record) => Object.keys(record))),
    ].filter(
      (key) =>
        key !== "updatedAt" && key !== "createdAt" && key !== "isDeleted",
    );
    objKeysBefore.sort((a, b) => a.localeCompare(b));
    objKeysAfter.sort((a, b) => a.localeCompare(b));
    if (!objKeysBefore.every((_, i) => objKeysBefore[i] == objKeysAfter[i])) {
      console.log({
        objKeysBefore,
        objKeysAfter,
        test: new Set(recordsAfter.flatMap((record) => Object.keys(record))),
      });
      throw new Error("KEY SETS DO NOT MATCH");
    }
  }

  // get the records that are common to both sets
  const commonKeys = new Set(keysAfter.filter((key) => keySetBefore.has(key)));
  const commonRecords = recordsAfter.filter((record) =>
    commonKeys.has(getId(record)),
  );

  // determine which records did not change
  const equal = commonRecords.filter((record) => {
    const before = indexBefore[getId(record)];
    // `commonRecords` only contains keys present in both sets, so `before` is
    // always defined here; guard anyway to satisfy the type checker.
    return before !== undefined && recordsAreEqual(before, record);
  });
  const equalKeys = new Set(equal.map((record) => getId(record)));

  // determine which records have been modified
  const modified = commonRecords.filter(
    (record) => !equalKeys.has(getId(record)),
  );

  // sanity check
  const numInputs = new Set([
    ...keysBefore.map((x) => x.toString()),
    ...keysAfter.map((x) => x.toString()),
  ]).size;
  const numOutputs =
    created.length + deleted.length + equal.length + modified.length;
  if (numOutputs !== numInputs) {
    console.log({
      created,
      deleted,
      equal,
      modified,
      keysUnion: [
        ...new Set([
          ...keysBefore.map((x) => x.toString()),
          ...keysAfter.map((x) => x.toString()),
        ]),
      ],
      numInputs,
      numOutputs,
    });
    throw new NonRetriableError(
      "compareSets: input and output length do not match",
    );
  }

  return { created, deleted, equal, modified };
};
