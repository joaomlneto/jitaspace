/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import {
  buildDatabaseStatusResponse,
  DATABASE_STATUS_STALE_MINUTES,
  humanizeTableName,
} from "~/lib/databaseStatus";

describe("humanizeTableName", () => {
  it("splits PascalCase model names into words", () => {
    expect(humanizeTableName("Character")).toBe("Character");
    expect(humanizeTableName("CharacterCorporationMembership")).toBe(
      "Character Corporation Membership",
    );
    expect(humanizeTableName("KillmailVictimItems")).toBe(
      "Killmail Victim Items",
    );
  });

  it("upper-cases known acronyms", () => {
    expect(humanizeTableName("NpcCorporationDivision")).toBe(
      "NPC Corporation Division",
    );
  });

  it("handles snake_case / leading-underscore names", () => {
    expect(humanizeTableName("_prisma_migrations")).toBe("Prisma Migrations");
  });
});

describe("buildDatabaseStatusResponse", () => {
  const fetchedAt = new Date(Date.UTC(2026, 5, 10, 8, 0, 0));

  it("sorts tables by descending row count and computes totals", () => {
    const response = buildDatabaseStatusResponse({
      rows: [
        { name: "Character", rowCount: 10 },
        { name: "Type", rowCount: 500 },
        { name: "Region", rowCount: 0 },
      ],
      fetchedAt,
    });

    expect(response.tables.map((table) => table.name)).toEqual([
      "Type",
      "Character",
      "Region",
    ]);
    expect(response.tables[0]?.label).toBe("Type");
    expect(response.totals.tables).toBe(3);
    expect(response.totals.rows).toBe(510);
    expect(response.approximate).toBe(true);
    expect(response.staleMinutes).toBe(DATABASE_STATUS_STALE_MINUTES);
    expect(response.fetchedAt).toBe(fetchedAt.toISOString());
    expect(response.error).toBeUndefined();
  });

  it("breaks row-count ties by table name", () => {
    const response = buildDatabaseStatusResponse({
      rows: [
        { name: "Beta", rowCount: 5 },
        { name: "Alpha", rowCount: 5 },
      ],
      fetchedAt,
    });
    expect(response.tables.map((table) => table.name)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("clamps non-finite or negative estimates to zero", () => {
    const response = buildDatabaseStatusResponse({
      rows: [
        { name: "Bad", rowCount: Number.NaN },
        { name: "Negative", rowCount: -7 },
        { name: "Good", rowCount: 3 },
      ],
      fetchedAt,
    });
    expect(response.totals.rows).toBe(3);
    expect(
      response.tables.find((table) => table.name === "Bad")?.rowCount,
    ).toBe(0);
    expect(
      response.tables.find((table) => table.name === "Negative")?.rowCount,
    ).toBe(0);
  });

  it("returns an error payload with no tables", () => {
    const response = buildDatabaseStatusResponse({
      rows: [],
      fetchedAt,
      error: "connection refused",
    });
    expect(response.error).toBe("connection refused");
    expect(response.tables).toEqual([]);
    expect(response.totals).toEqual({ tables: 0, rows: 0 });
  });
});
