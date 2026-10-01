import { historySchema, Prisma } from "@jitaspace/db-history";

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

/**
 * A history table's schema-qualified name, for interpolating into `$queryRaw`.
 *
 * Prisma qualifies its own SQL with {@link historySchema}, but raw SQL is sent
 * as written and resolved through the connection's `search_path`. A bare
 * `FROM "Change"` therefore fails with `42P01 relation "Change" does not exist`
 * wherever the history tables are outside `public`, while every generated query
 * keeps working — which is how `/history/compare` broke in production with the
 * rest of `/history` healthy.
 *
 *     $queryRaw`SELECT … FROM ${historyTable("Change")} c`
 *
 * The argument is typed to the model names, so a raw query cannot reference a
 * table the schema does not declare.
 */
export const historyTable = (table: Prisma.ModelName) =>
  Prisma.raw(`${quote(historySchema)}.${quote(table)}`);
