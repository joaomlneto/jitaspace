import pLimit from "p-limit";

import type { sdeInputFiles, SdeRecord } from "@jitaspace/sde-utils";

import type { CrudStatistics } from "../types";
import { updateTable } from "../utils";
import { loadSdeFile } from "./loadSdeFile";

/**
 * The slice of a Prisma model delegate that {@link ingestSdeTable} needs. The
 * argument types are `any` so any `prisma.<model>` delegate is assignable
 * regardless of its specific generated argument types (the same trade-off
 * `updateTable` makes).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- structural Prisma delegate */
export interface SoftDeleteDelegate {
  findMany(args: any): Promise<Record<string, unknown>[]>;
  createMany(args: any): Promise<unknown>;
  update(args: any): Promise<unknown>;
  updateMany(args: any): Promise<unknown>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Ingest one SDE file into one table with a single integer primary key, using
 * the shared diff-based {@link updateTable} flow (create new rows, update
 * changed rows, soft-delete rows that vanished from the SDE).
 *
 * `toRow` receives each record and its id (the SDE map key — works for both
 * `addId` files, where the id is also a field, and `noTransform` files, where
 * the id is only the key) and returns the DB row. Only the columns `toRow`
 * produces are compared/written: any other column on the local row (createdAt /
 * updatedAt, or a column owned by a different scraper such as `Type.packagedVolume`
 * or `Race.factionId`) is ignored, so ingestion never clobbers it.
 *
 * Referenced foreign keys (e.g. `Group` for a `Type`) are assumed to already
 * exist, exactly like the existing per-entity scrapers. Prisma batches large
 * `createMany`/`IN (...)` queries internally, so no manual chunking is needed.
 */
export async function ingestSdeTable<
  Row extends Record<string, unknown>,
>(opts: {
  filename: keyof typeof sdeInputFiles;
  idField: keyof Row & string;
  delegate: SoftDeleteDelegate;
  toRow: (record: Record<string, unknown>, id: number) => Row;
  /** Pre-loaded records, mainly for tests; otherwise the file is downloaded. */
  records?: SdeRecord;
  concurrency?: number;
}): Promise<CrudStatistics> {
  const { filename, idField, delegate, toRow, concurrency = 20 } = opts;

  const data = opts.records ?? (await loadSdeFile(filename));
  const limit = pLimit(concurrency);

  const remote = Object.entries(data).map(([key, record]) =>
    toRow(record as Record<string, unknown>, Number(key)),
  );

  // The columns this file owns. Strip everything else off the local rows so the
  // diff only considers managed columns (createdAt/updatedAt and other scrapers'
  // columns are left untouched on update).
  const sample = remote[0];
  const managedKeys = new Set(sample ? Object.keys(sample) : []);
  const ids = remote.map((row) => row[idField] as number);

  return updateTable<Row, number>({
    idAccessor: (row) => row[idField] as number,
    fetchLocalEntries: async () =>
      delegate
        .findMany({ where: { [idField]: { in: ids } } })
        .then((rows) =>
          rows.map(
            (row) =>
              Object.fromEntries(
                Object.entries(row).filter(([key]) => managedKeys.has(key)),
              ) as Row,
          ),
        ),
    fetchRemoteEntries: () => Promise.resolve(remote),
    batchCreate: (rows) => limit(() => delegate.createMany({ data: rows })),
    batchUpdate: (rows) =>
      Promise.all(
        rows.map((row) =>
          limit(() =>
            delegate.update({
              data: row,
              where: { [idField]: row[idField] },
            }),
          ),
        ),
      ),
    batchDelete: (rows) =>
      delegate.updateMany({
        data: { isDeleted: true },
        where: { [idField]: { in: rows.map((row) => row[idField]) } },
      }),
  });
}
