import { Prisma } from "@jitaspace/db";

/**
 * A row ready for a Prisma model write (`create` / `createMany` / `update`),
 * with every number Prisma cannot write exactly passed as a `Prisma.Decimal`.
 *
 * Prisma's query compiler re-parses a `Float` argument before it reaches the
 * driver, and past the int64 range (~9.2e18) that parse is lossy: ~40% of such
 * doubles land 1–4 ULP off (measured on Prisma 7.8.0 and 7.10.0 against
 * CockroachDB; `$executeRaw`, `pg`, the database and model reads are all
 * exact). The SDE's planet and moon masses (~1e20–1e25) sit in that range, so
 * the ingest's exact diff never matched them again and rewrote those rows on
 * every run. A `Decimal` reaches the driver as its exact digits instead.
 *
 * The cut-off is the unsafe-integer range (|x| ≥ 2^53) rather than int64 itself:
 * every double there is integral, `Int` columns never hold one and `BigInt`
 * columns arrive as `bigint`, so only `Float` values are converted. Prisma types
 * `Float` inputs as `number`; should it ever stop accepting a `Decimal` there,
 * the write fails loudly instead of storing a wrong value.
 */
export function exactFloats<Row extends Record<string, unknown>>(
  row: Row,
): Row {
  let out: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(row)) {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      !Number.isSafeInteger(value)
    ) {
      out ??= { ...row };
      out[key] = new Prisma.Decimal(value.toString());
    }
  }
  return (out ?? row) as Row;
}
