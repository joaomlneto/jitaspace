import pLimit from "p-limit";

import type { CrudStatistics } from "../types";
import type { SoftDeleteDelegate } from "./ingestSdeTable";
import { excludeObjectKeys, updateTable } from "../utils";

// CockroachDB/Postgres cap bind parameters per statement (Postgres wire limit:
// 65535). The composite soft-delete builds an `OR` of N composite keys, spending
// `keyFields.length` params per row — and Prisma does NOT split an `OR` across
// statements the way it transparently chunks `createMany` / `IN (...)`. So cap
// each soft-delete `OR` well under the limit (30000 / a 2-column key = 15000
// rows per statement, leaving ample headroom under 65535).
const MAX_DELETE_PARAMS = 30000;

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }
  return chunks;
};

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
 *
 * The diff runs in scope chunks (`scopeChunkSize` parent ids at a time): each
 * chunk only holds its own rows, local fetch and `compareSets` indexes, so big
 * tables (typeDogma builds ~500k–1M rows) don't build a multi-GB in-memory diff.
 * Chunking by scope keeps the soft-delete correct — the scope bounds both the
 * local fetch and the remote rows, so within a chunk a local row with no
 * matching remote row is still detected and soft-deleted.
 *
 * Pass `softDelete: false` when another writer also owns the table — e.g. the
 * ESI `scrapeEsiTypes` scraper also fills TypeAttribute / TypeEffect. The local
 * fetch is then filtered to the remote keys, so the diff only creates/updates
 * and never soft-deletes rows the other writer owns (the same "never delete what
 * the SDE didn't fetch" guarantee {@link import("./ingestSdeTable").ingestSdeTable}
 * gives for single-key tables).
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
  /** Parent (scope) ids diffed/written per chunk (bounds peak memory). */
  scopeChunkSize?: number;
  /**
   * Soft-delete local rows absent from the SDE (default true). Set false to
   * coexist with another writer of the same table: the diff then only
   * creates/updates and never deletes (see the function docs).
   */
  softDelete?: boolean;
}): Promise<CrudStatistics> {
  const {
    delegate,
    rows,
    keyFields,
    scopeField,
    scopeIds,
    concurrency = 20,
    scopeChunkSize = 5000,
    softDelete = true,
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
  // Index the remote rows by scope value so each chunk grabs only its rows.
  const rowsByScope = new Map<unknown, Row[]>();
  for (const row of uniqueRows) {
    const scope = row[scopeField];
    const bucket = rowsByScope.get(scope);
    if (bucket) bucket.push(row);
    else rowsByScope.set(scope, [row]);
  }
  // Prisma's composite unique-input is the @@id columns joined by `_`.
  const whereUnique = (row: Row) =>
    keyFields.length === 1
      ? keyValues(row)
      : { [keyFields.join("_")]: keyValues(row) };

  const stats: CrudStatistics = {
    created: 0,
    modified: 0,
    deleted: 0,
    equal: 0,
  };
  for (let offset = 0; offset < scopeIds.length; offset += scopeChunkSize) {
    const chunkScopeIds = scopeIds.slice(offset, offset + scopeChunkSize);
    const chunkRows = chunkScopeIds.flatMap(
      (scope) => rowsByScope.get(scope) ?? [],
    );
    // Additive (coexist) mode: drop local rows whose key isn't in the SDE before
    // diffing, so they're never seen as "deleted". This is the composite-key
    // equivalent of scoping the fetch — a single WHERE can't express "key IN
    // (these pairs)" cheaply — and gives the same never-delete-another-writer's-
    // rows guarantee as `ingestSdeTable`.
    const remoteKeys = softDelete ? null : new Set(chunkRows.map(keyOf));
    const chunkStats = await updateTable({
      idAccessor: keyOf,
      fetchLocalEntries: async () =>
        delegate
          .findMany({ where: { [scopeField]: { in: chunkScopeIds } } })
          .then((local) => {
            const managed = local.map(
              (row) =>
                excludeObjectKeys(row, ["updatedAt", "createdAt"]) as Row,
            );
            return remoteKeys
              ? managed.filter((row) => remoteKeys.has(keyOf(row)))
              : managed;
          }),
      fetchRemoteEntries: () => Promise.resolve(chunkRows),
      batchCreate: (created) =>
        limit(() => delegate.createMany({ data: created })),
      batchUpdate: (modified) =>
        Promise.all(
          modified.map((row) =>
            limit(() =>
              delegate.update({ data: row, where: whereUnique(row) }),
            ),
          ),
        ),
      // Chunk the soft-delete so a large `OR` never exceeds the DB's bind-param
      // limit (see MAX_DELETE_PARAMS). In additive mode `deleted` is always
      // empty (the fetch above filtered to remote keys), so this is a no-op.
      batchDelete: (deleted) =>
        Promise.all(
          chunkArray(
            deleted,
            Math.max(1, Math.floor(MAX_DELETE_PARAMS / keyFields.length)),
          ).map((slice) =>
            limit(() =>
              delegate.updateMany({
                data: { isDeleted: true },
                where: { OR: slice.map(keyValues) },
              }),
            ),
          ),
        ),
    });
    stats.created += chunkStats.created;
    stats.modified += chunkStats.modified;
    stats.deleted += chunkStats.deleted;
    stats.equal += chunkStats.equal;
  }
  return stats;
}
