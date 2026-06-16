/**
 * Types and pure aggregation logic for the database status server function
 * (`app/status/actions.ts`) and the status-page dashboard.
 *
 * The counts are CockroachDB's estimated row counts (read from the latest
 * table statistics via `crdb_internal.table_row_statistics`), not exact
 * `count(*)` results — see `getDatabaseStatus` for why. This module only
 * shapes/aggregates the rows; the actual query lives in the server function.
 *
 * Keep this module free of server-only imports — client components import
 * types and constants from it.
 */

/**
 * How long a database snapshot is cached server-side (and effectively how
 * stale the dashboard may be). The request asked for "stale for a few
 * minutes"; CockroachDB's statistics themselves only refresh periodically, so
 * a shorter window would not buy fresher numbers anyway.
 */
export const DATABASE_STATUS_STALE_MINUTES = 5;

export interface DatabaseTableStat {
  /** Physical table name (equals the Prisma model name — no `@@map` is used). */
  name: string;
  /** Human-friendly label derived from the table name. */
  label: string;
  /** Estimated number of rows, from CockroachDB table statistics. */
  rowCount: number;
}

export interface DatabaseStatusResponse {
  fetchedAt: string;
  /** Server-side cache window, in minutes. */
  staleMinutes: number;
  /**
   * The counts are always estimates from table statistics; kept explicit so
   * the UI can label them honestly and so the meaning is obvious to callers.
   */
  approximate: boolean;
  /** Set when the database could not be reached. */
  error?: string;
  /** All tables, sorted by descending row count. */
  tables: DatabaseTableStat[];
  totals: {
    tables: number;
    rows: number;
  };
}

/** Acronyms that should stay upper-cased in humanized table labels. */
const ACRONYMS: Record<string, string> = {
  npc: "NPC",
  esi: "ESI",
  sde: "SDE",
  id: "ID",
  ids: "IDs",
  url: "URL",
};

/**
 * Turn a physical table name into a display label, e.g.
 * `KillmailVictimItems` → "Killmail Victim Items",
 * `NpcCorporationDivision` → "NPC Corporation Division",
 * `_prisma_migrations` → "Prisma Migrations".
 */
export const humanizeTableName = (name: string): string => {
  const words = name
    .replace(/_/g, " ")
    // split runs of capitals followed by a capital+lowercase: "IDList" → "ID List"
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // split lowercase/digit → uppercase boundaries: "killmailVictim" → "killmail Victim"
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);

  return words
    .map((word) => {
      const acronym = ACRONYMS[word.toLowerCase()];
      if (acronym) return acronym;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

export const buildDatabaseStatusResponse = ({
  rows,
  fetchedAt,
  staleMinutes = DATABASE_STATUS_STALE_MINUTES,
  error,
}: {
  rows: { name: string; rowCount: number }[];
  fetchedAt: Date;
  staleMinutes?: number;
  error?: string;
}): DatabaseStatusResponse => {
  const tables: DatabaseTableStat[] = rows
    .map((row) => ({
      name: row.name,
      label: humanizeTableName(row.name),
      // Guard against NaN/negative estimates so totals stay sane.
      rowCount: Number.isFinite(row.rowCount) ? Math.max(0, row.rowCount) : 0,
    }))
    .sort((a, b) => b.rowCount - a.rowCount || a.name.localeCompare(b.name));

  const rowsTotal = tables.reduce((sum, table) => sum + table.rowCount, 0);

  return {
    fetchedAt: fetchedAt.toISOString(),
    staleMinutes,
    approximate: true,
    ...(error ? { error } : {}),
    tables,
    totals: {
      tables: tables.length,
      rows: rowsTotal,
    },
  };
};
