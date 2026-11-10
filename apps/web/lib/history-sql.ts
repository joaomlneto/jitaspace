import { buildsSchema, Prisma } from "@jitaspace/db-builds";

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

/**
 * A history table's schema-qualified name, for interpolating into `$queryRaw`.
 *
 * Prisma qualifies its own SQL with {@link buildsSchema}, but raw SQL is sent
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
  Prisma.raw(`${quote(buildsSchema)}.${quote(table)}`);

/**
 * A raw-SQL condition: the build in column `buildColumn` (e.g. `d."toBuild"`)
 * is not a Singularity-only build. That is, Tranquility has run it, or no
 * server has been recorded for it at all, the same rule
 * `isBuildInHistoryScope` applies to `buildPlacement`'s server. A build tested
 * on Singularity and then promoted passes.
 *
 * `::text` sidesteps enum-literal handling.
 *
 *     $queryRaw`… WHERE ${notSingularityOnly(Prisma.raw('d."toBuild"'))}`
 */
export const notSingularityOnly = (buildColumn: Prisma.Sql) => Prisma.sql`(
  EXISTS (
    SELECT 1 FROM ${historyTable("BuildDeployment")} tq
     WHERE tq."buildNumber" = ${buildColumn} AND tq."server"::text = 'tranquility'
  ) OR NOT EXISTS (
    SELECT 1 FROM ${historyTable("BuildDeployment")} sisi
     WHERE sisi."buildNumber" = ${buildColumn} AND sisi."server"::text = 'singularity'
  )
)`;
