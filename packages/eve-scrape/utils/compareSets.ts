import { env } from "../env.mjs";

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

  const indexBefore: {
    [key: string | number | symbol]: T;
  } = {};
  recordsBefore.forEach((record) => (indexBefore[getId(record)] = record));

  const indexAfter: {
    [key: string | number | symbol]: T;
  } = {};
  recordsAfter.forEach((record) => (indexAfter[getId(record)] = record));

  // determine which records were created
  const created: T[] = recordsAfter.filter(
    (record) => !keysBefore.includes(getId(record)),
  );

  // determine which records were deleted
  const deleted = recordsBefore.filter(
    (record) => !keysAfter.includes(getId(record)),
  );

  // validate that object keys are the same
  // this strangely causes the scrapeEsiTypes to crash due to "Maximum call stack size exceeded"
  if (env.NODE_ENV === "development") {
    const objKeysBefore = [
      ...new Set(recordsBefore.flatMap((record) => Object.keys(record))),
    ];
    const objKeysAfter = [
      ...new Set(recordsAfter.flatMap((record) => Object.keys(record))),
    ];
    objKeysBefore.sort((a, b) => a.localeCompare(b));
    objKeysAfter.sort((a, b) => a.localeCompare(b));
    if (!objKeysBefore.every((_, i) => objKeysBefore[i] == objKeysAfter[i])) {
      console.log({
        objKeysBefore,
        objKeysAfter,
        test: new Set(recordsAfter.flatMap((record) => Object.keys(record))),
      });
      throw Error("KEY SETS DO NOT MATCH");
    }
  }

  // get the records that are common to both sets
  const commonKeys = keysAfter.filter((key) => keysBefore.includes(key));
  const commonRecords = recordsAfter.filter((record) =>
    commonKeys.includes(getId(record)),
  );

  // determine which records did not change
  const equal = commonRecords.filter((record) =>
    recordsAreEqual(indexBefore[getId(record)]!, record),
  );
  const equalKeys = equal.map((record) => getId(record));

  // determine which records have been modified
  const modified = commonRecords.filter(
    (record) => !equalKeys.includes(getId(record)),
  );

  /*
  modified.map((record) => {
    const before = indexBefore[getId(record)];
    const after = indexAfter[getId(record)];
    console.log({ before, after });
  });*/

  // sanity check
  if (
    created.length + deleted.length + equal.length + modified.length !==
    [
      ...new Set([
        ...keysBefore.map((x) => x.toString()),
        ...keysAfter.map((x) => x.toString()),
      ]),
    ].length
  ) {
    console.log({
      keysUnion: [
        ...new Set([
          ...keysBefore.map((x) => x.toString()),
          ...keysAfter.map((x) => x.toString()),
        ]),
      ],
      created,
      deleted,
      equal,
      modified,
    });
    throw Error("compareSets: input and output length do not match");
  }

  return { created, deleted, equal, modified };
};
