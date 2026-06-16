import pLimit from "p-limit";

import type { CrudStatistics } from "../types";
import type { SoftDeleteDelegate } from "./ingestSdeTable";
import { excludeObjectKeys, updateTable } from "../utils";

/**
 * Diff-ingest a derived set of rows into a table with a (possibly composite)
 * primary key — like {@link import("./ingestSdeTable").ingestSdeTable} but for
 * tables whose rows are built from a parent SDE file (e.g. typeDogma, blueprints)
 * and may have multi-column keys.
 *
 * `keyFields` are the primary-key columns. `scopeField`/`scopeIds` bound the
 * local fetch (and soft-delete) to the entities this run covers — typically the
 * parent id (`blueprintTypeId`). The rows must already include every managed
 * column; nothing else on the local row is touched apart from createdAt/updatedAt.
 */
export async function ingestSdeCompositeTable<
  Row extends Record<string, unknown>,
>(opts: {
  delegate: SoftDeleteDelegate;
  rows: Row[];
  keyFields: (keyof Row & string)[];
  scopeField: keyof Row & string;
  scopeIds: (number | string)[];
  concurrency?: number;
}): Promise<CrudStatistics> {
  const {
    delegate,
    rows,
    keyFields,
    scopeField,
    scopeIds,
    concurrency = 20,
  } = opts;
  const limit = pLimit(concurrency);

  const keyOf = (row: Row) =>
    keyFields.map((field) => String(row[field])).join(":");
  const keyValues = (row: Row) =>
    Object.fromEntries(keyFields.map((field) => [field, row[field]]));

  // The diff machinery (`compareSets`) requires unique keys in the remote set;
  // a repeated (parent, child) pair would make its input/output counts diverge
  // and throw. Some SDE structures can repeat a pair, so dedupe (last wins).
  const uniqueRows = [
    ...new Map(rows.map((row) => [keyOf(row), row])).values(),
  ];
  // Prisma's composite unique-input is the @@id columns joined by `_`.
  const whereUnique = (row: Row) =>
    keyFields.length === 1
      ? keyValues(row)
      : { [keyFields.join("_")]: keyValues(row) };

  return updateTable({
    idAccessor: keyOf,
    fetchLocalEntries: async () =>
      delegate
        .findMany({ where: { [scopeField]: { in: scopeIds } } })
        .then((local) =>
          local.map(
            (row) => excludeObjectKeys(row, ["updatedAt", "createdAt"]) as Row,
          ),
        ),
    fetchRemoteEntries: () => Promise.resolve(uniqueRows),
    batchCreate: (created) =>
      limit(() => delegate.createMany({ data: created })),
    batchUpdate: (modified) =>
      Promise.all(
        modified.map((row) =>
          limit(() => delegate.update({ data: row, where: whereUnique(row) })),
        ),
      ),
    batchDelete: (deleted) =>
      deleted.length === 0
        ? Promise.resolve()
        : delegate.updateMany({
            data: { isDeleted: true },
            where: { OR: deleted.map(keyValues) },
          }),
  });
}
