import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import {
  SDE_OWNED_CORPORATION_COLUMNS,
  SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS,
  SDE_OWNED_MOON_COLUMNS,
  SDE_OWNED_PLANET_COLUMNS,
  SDE_OWNED_SOLAR_SYSTEM_COLUMNS,
  SDE_OWNED_TYPE_COLUMNS,
} from "../helpers/sdeOwnedColumns";

/**
 * The `Esi*Row` types in the scrapers (`Omit<Model, timestamps | SDE-owned>`)
 * already make the compiler catch a column that is written by neither writer,
 * or listed as SDE-owned while ESI still supplies it. What they cannot catch is
 * the opposite drift: `Omit` silently ignores a key that no longer exists on
 * the model, so an entry left behind after a column is renamed or dropped
 * strips nothing and reads as if it were still doing its job.
 *
 * So this reads the schema and asserts every listed column is real.
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

const TABLES: [model: string, sdeOwned: readonly string[]][] = [
  ["Corporation", SDE_OWNED_CORPORATION_COLUMNS],
  ["DogmaAttribute", SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS],
  ["Moon", SDE_OWNED_MOON_COLUMNS],
  ["Planet", SDE_OWNED_PLANET_COLUMNS],
  ["SolarSystem", SDE_OWNED_SOLAR_SYSTEM_COLUMNS],
  ["Type", SDE_OWNED_TYPE_COLUMNS],
];

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
