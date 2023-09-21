import { CrudStatistics } from "../types";
import { compareSets } from "./compareSets";
import { recordsAreEqual } from "./recordsAreEqual";

// FIXME: Add support for ETags!
export const updateTable = async <
  DbType extends Record<string | number, any>,
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
  batchCreate: (entries: DbType[]) => Promise<any>;
  // function to update array of entries
  batchUpdate: (entries: DbType[]) => Promise<any>;
  // function to delete array of entries
  batchDelete: (entries: DbType[]) => Promise<any>;
}): Promise<CrudStatistics> => {
  const esiEntries = await fetchRemoteEntries();
  const dbEntries = await fetchLocalEntries();

  const diffs = compareSets({
    recordsBefore: dbEntries,
    recordsAfter: esiEntries,
    getId: idAccessor,
    recordsAreEqual,
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
