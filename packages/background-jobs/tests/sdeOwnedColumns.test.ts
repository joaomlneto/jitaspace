import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import * as sdeOwnedColumns from "../helpers/sdeOwnedColumns";

/**
 * The `Esi*Row` types in the scrapers (`Omit<Model, timestamps | SDE-owned>`)
 * already make the compiler catch a column that is written by neither writer,
 * or listed as SDE-owned while ESI still supplies it. What they cannot catch is
 * the opposite drift: `Omit` silently ignores a key that no longer exists on
 * the model, so an entry left behind after a column is renamed or dropped
 * strips nothing and reads as if it were still doing its job.
 *
 * So this reads the schema and asserts every listed column is real.
 *
 * The lists are discovered from the module rather than named one by one: they
 * were hand-listed once and six of nineteen were covered, which is the same
 * quiet gap in miniature.
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
function scalarColumnsOf(schema: string, modelName: string): Set<string> {
  const block = new RegExp(
    `^model ${modelName} \\{$([\\s\\S]*?)^\\}$`,
    "m",
  ).exec(schema);
  if (!block?.[1]) throw new Error(`model ${modelName} not found in schema`);

  const columns = block[1]
    .split("\n")
    .map((line) => line.trim())
    .map((line) => /^(\w+)\s+(\w+)\??(\s|$)/.exec(line))
    .filter((match) => match !== null)
    .filter((match) => SCALAR_TYPES.has(match[2]!))
    .map((match) => match[1]!);

  return new Set(columns);
}

/** `SDE_OWNED_ASTEROID_BELT_COLUMNS` -> `AsteroidBelt`. */
const modelNameOf = (listName: string) =>
  listName
    .replace(/^SDE_OWNED_|_COLUMNS$/g, "")
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join("");

const TABLES: [model: string, sdeOwned: readonly string[]][] = Object.entries(
  sdeOwnedColumns,
)
  .filter(([, columns]) => Array.isArray(columns))
  // Each export is a distinct `as const` tuple, so widen to the common shape.
  .map(([listName, columns]) => [
    modelNameOf(listName),
    columns as readonly string[],
  ]);

describe("SDE-owned column lists", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");

  it.each(TABLES)(
    "%s: every listed column exists on the model",
    (model, sdeOwned) => {
      const columns = scalarColumnsOf(schema, model);
      const missing = sdeOwned.filter((column) => !columns.has(column));

      // Drop the entry if the column is gone; rename it if the column was
      // renamed. Leaving it here strips a key no row has.
      expect(missing).toEqual([]);
    },
  );

  it("covers every declared list", () => {
    // A list nobody wired into this table is a list nobody checks.
    expect(TABLES.length).toBe(
      Object.keys(sdeOwnedColumns).filter((name) =>
        /^SDE_OWNED_\w+_COLUMNS$/.test(name),
      ).length,
    );
    expect(TABLES.length).toBeGreaterThan(15);
  });

  it("finds the columns it claims to parse", () => {
    // Guards the parser itself: if a schema formatting change stopped it
    // matching field declarations, every assertion above would pass vacuously.
    const columns = scalarColumnsOf(schema, "SolarSystem");

    expect(columns.has("solarSystemId")).toBe(true);
    expect(columns.has("luminosity")).toBe(true);
    // Relation and list fields are not columns.
    expect(columns.has("constellation")).toBe(false);
    expect(columns.has("stations")).toBe(false);
  });
});
