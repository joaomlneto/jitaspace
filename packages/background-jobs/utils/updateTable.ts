import type { CrudStatistics } from "../types";
import { compareSets } from "./compareSets";
import { recordsAreEqual } from "./recordsAreEqual";

// FIXME: Add support for ETags!
export const updateTable = async <
  DbType extends object,
  IdType extends string | number,
>({
  idAccessor,
  fetchLocalEntries,
  fetchRemoteEntries,
  batchCreate,
  batchUpdate,
  batchDelete,
}: {
  // function to retrieve the ID of a given entry
  idAccessor: (t: DbType) => IdType;
  // function that retrieves all relevant entries from the database
  fetchLocalEntries: () => Promise<DbType[]>;
  // function that retrieves all relevant entries from ESI
  fetchRemoteEntries: () => Promise<DbType[]>;
  // function to create array of entries
  batchCreate: (entries: DbType[]) => Promise<unknown>;
  // function to update array of entries
  batchUpdate: (entries: DbType[]) => Promise<unknown>;
  // function to delete array of entries
  batchDelete: (entries: DbType[]) => Promise<unknown>;
}): Promise<CrudStatistics> => {
  const esiEntries = await fetchRemoteEntries();
  const dbEntries = await fetchLocalEntries();

  const diffs = compareSets({
    recordsBefore: dbEntries,
    recordsAfter: esiEntries,
    getId: idAccessor,
    // `recordsAreEqual` is constrained to record-like types so it can walk the
    // row's keys. Rows are only known to be `object` here — and interfaces have
    // no implicit index signature — so widen at the boundary rather than
    // forcing every caller's row type to carry one.
    recordsAreEqual: (a, b) =>
      recordsAreEqual(
        a as Record<string, unknown>,
        b as Record<string, unknown>,
      ),
  });

  await batchCreate(diffs.created);
  await batchUpdate(diffs.modified);
  await batchDelete(diffs.deleted);

  return {
    created: diffs.created.length,
    deleted: diffs.deleted.length,
    modified: diffs.modified.length,
    equal: diffs.equal.length,
  };
};
