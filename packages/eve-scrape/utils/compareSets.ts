export const compareSets = <T, Key extends keyof T>({
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

  // get the records that are common to both sets
  const commonKeys = keysAfter.filter((key) => keysBefore.includes(key));
  const commonRecordPairs = commonKeys.map((key) => ({
    recordBefore: indexBefore[key]!,
    recordAfter: indexAfter[key]!,
  }));

  // determine which records did not change
  const equal = commonRecordPairs
    .filter(({ recordBefore, recordAfter }) =>
      recordsAreEqual(recordBefore, recordAfter),
    )
    .map(({ recordBefore, recordAfter }) => recordAfter);
  const equalKeys = equal.map((record) => getId(record));

  // determine which records have been modified
  const modified = recordsAfter.filter(
    (record) => !equalKeys.includes(getId(record)),
  );

  return { created, deleted, equal, modified };
};
