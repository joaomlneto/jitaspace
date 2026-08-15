import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import {
  SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS,
  SDE_OWNED_MOON_COLUMNS,
  SDE_OWNED_PLANET_COLUMNS,
  SDE_OWNED_SOLAR_SYSTEM_COLUMNS,
} from "../helpers/sdeOwnedColumns";

/**
 * `updateTable` compares a local row against an ESI payload by walking the
 * *local* row's keys, so a column ESI never supplies must be stripped from the
 * local row or every row diffs as modified on every run. The strip lists in
 * `sdeOwnedColumns.ts` are what does the stripping, and nothing type-checks
 * them: add a column to the schema, forget the list, and the only symptom is a
 * scraper that rewrites the whole table forever.
 *
 * These tests close that gap by reading the Prisma schema itself. Every scalar
 * column of a table an ESI scraper diffs must be classified as exactly one of:
 * written by the ESI scraper, owned by an SDE ingest job, or local bookkeeping.
 * A new column that is none of the three fails here until it is classified.
 */

const SCHEMA_PATH = join(
  __dirname,
  "..",
  "..",
  "db",
  "prisma",
  "schema.prisma",
);

/** Prisma scalar types, as they appear in the schema's field declarations. */
const SCALAR_TYPES = new Set([
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "String",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
]);

/**
 * The scalar field names of one `model` block. Relation fields carry a model
 * type and list fields end in `[]`, so both fall out by keeping only the
 * declarations whose type is a known Prisma scalar.
 */
function scalarColumnsOf(schema: string, modelName: string): string[] {
  const block = new RegExp(`^model ${modelName} \\{$([\\s\\S]*?)^\\}$`, "m").exec(
    schema,
  );
  if (!block?.[1]) throw new Error(`model ${modelName} not found in schema`);

  return block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("/") && !line.startsWith("@"))
    .map((line) => /^(\w+)\s+(\w+)(\?)?(\s|$)/.exec(line))
    .filter((match) => match !== null)
    .filter((match) => SCALAR_TYPES.has(match[2]!))
    .map((match) => match[1]!);
}

/** Written on every row by both writers; never part of an ESI/SDE diff. */
const BOOKKEEPING = ["createdAt", "updatedAt", "isDeleted"];

const TABLES = [
  {
    model: "SolarSystem",
    // The row `scrapeEsiSolarSystems` builds from /universe/systems/{id}.
    esiWritten: [
      "solarSystemId",
      "constellationId",
      "name",
      "securityClass",
      "securityStatus",
      "starId",
    ],
    sdeOwned: SDE_OWNED_SOLAR_SYSTEM_COLUMNS,
  },
  {
    model: "DogmaAttribute",
    // The row `scrapeEsiDogmaAttributes` builds from /dogma/attributes/{id}.
    esiWritten: [
      "attributeId",
      "name",
      "published",
      "description",
      "defaultValue",
      "displayName",
      "highIsGood",
      "iconId",
      "stackable",
      "unitId",
    ],
    sdeOwned: SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS,
  },
  {
    model: "Planet",
    // The row `scrapeEsiSolarSystems` builds from /universe/planets/{id}.
    esiWritten: ["planetId", "solarSystemId", "name", "typeId"],
    sdeOwned: SDE_OWNED_PLANET_COLUMNS,
  },
  {
    model: "Moon",
    // The row `scrapeEsiSolarSystems` builds from /universe/moons/{id}.
    esiWritten: ["moonId", "planetId", "name"],
    sdeOwned: SDE_OWNED_MOON_COLUMNS,
  },
] as const;

describe("SDE-owned column lists", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");

  it.each(TABLES.map((table) => [table.model, table] as const))(
    "%s: every scalar column is classified",
    (_model, table) => {
      const classified = new Set<string>([
        ...table.esiWritten,
        ...table.sdeOwned,
        ...BOOKKEEPING,
      ]);
      const unclassified = scalarColumnsOf(schema, table.model).filter(
        (column) => !classified.has(column),
      );

      // A column here is written by neither writer, or is SDE-owned and missing
      // from its strip list. Either way, add it to the right list above (and to
      // `sdeOwnedColumns.ts` if the SDE ingest writes it).
      expect(unclassified).toEqual([]);
    },
  );

  it.each(TABLES.map((table) => [table.model, table] as const))(
    "%s: no column is claimed by both ESI and the SDE ingest",
    (_model, table) => {
      const esiWritten = new Set<string>(table.esiWritten);
      const overlap = table.sdeOwned.filter((column) => esiWritten.has(column));

      // Stripping a column ESI does write would hide real ESI updates.
      expect(overlap).toEqual([]);
    },
  );

  it.each(TABLES.map((table) => [table.model, table] as const))(
    "%s: every SDE-owned column exists in the schema",
    (_model, table) => {
      const columns = new Set(scalarColumnsOf(schema, table.model));
      const missing = table.sdeOwned.filter((column) => !columns.has(column));

      // A stale entry strips nothing; it just hides that the column is gone.
      expect(missing).toEqual([]);
    },
  );
});
