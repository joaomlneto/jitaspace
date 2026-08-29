/**
 * Every `ingestSdeCompositeTable` call's `keyFields` must be exactly its model's
 * `@@id` columns.
 *
 * The helper builds Prisma's composite unique input by joining `keyFields` with
 * `_`, so a list that disagrees with the schema produces a `where` Prisma does
 * not recognise — and it throws only on the `update` branch. A first run creates
 * every row and an unchanged run compares equal, so a mismatch can sit in a
 * shipped job through many green runs and surface the first time CCP edits one
 * of those rows. That is exactly what happened when `IndustryModifierSource`
 * gained `industryTargetFilterId` in its `@@id` and the job kept the old
 * four-column list.
 *
 * Read as text: importing the schema is not possible, and the generated client
 * does not expose `@@id` in a form worth reflecting over.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const SDE_JOBS_DIR = path.join(__dirname, "..", "jobs", "scrape", "sde");
const SCHEMA = path.join(
  __dirname,
  "..",
  "..",
  "db",
  "prisma",
  "schema.prisma",
);

/**
 * model name -> its primary-key columns: the `@@id([...])` list, or the single
 * field marked `@id`. The composite helper handles both — with one key field it
 * passes the value straight through rather than building a joined input.
 */
function compositeIds(): Map<string, string[]> {
  const schema = fs.readFileSync(SCHEMA, "utf8");
  const ids = new Map<string, string[]>();
  for (const model of schema.matchAll(/^model (\w+) \{(.*?)^\}/gms)) {
    const declared = /^\s*@@id\(\[([^\]]+)\]\)/m.exec(model[2]!);
    if (declared) {
      ids.set(
        model[1]!,
        declared[1]!.split(",").map((column) => column.trim()),
      );
      continue;
    }
    const single = /^\s{2}(\w+)\s+\w+\??\s+@id\b/m.exec(model[2]!);
    if (single) ids.set(model[1]!, [single[1]!]);
  }
  return ids;
}

/** Every `ingestSdeCompositeTable({...})` call, as (model, keyFields). */
function compositeCalls(): { file: string; model: string; keys: string[] }[] {
  const calls: { file: string; model: string; keys: string[] }[] = [];
  for (const file of fs.readdirSync(SDE_JOBS_DIR).filter((f) => f.endsWith(".ts"))) {
    const source = fs.readFileSync(path.join(SDE_JOBS_DIR, file), "utf8");
    for (const call of source.matchAll(/ingestSdeCompositeTable\(\{([\s\S]*?)\n {4}\}\)/g)) {
      const body = call[1]!;
      const delegate = /delegate:\s*prisma\.(\w+)/.exec(body);
      const keyFields = /keyFields:\s*\[([\s\S]*?)\]/.exec(body);
      if (!delegate || !keyFields) continue;
      calls.push({
        file,
        // prisma.industryModifierSource -> IndustryModifierSource
        model: delegate[1]![0]!.toUpperCase() + delegate[1]!.slice(1),
        keys: [...keyFields[1]!.matchAll(/"(\w+)"/g)].map((m) => m[1]!),
      });
    }
  }
  return calls;
}

describe("ingestSdeCompositeTable keyFields", () => {
  const ids = compositeIds();
  const calls = compositeCalls();

  it("finds the calls and the schema (guards the parsing above)", () => {
    expect(calls.length).toBeGreaterThan(20);
    expect(ids.size).toBeGreaterThan(20);
  });

  it("matches every call's keyFields to its model's @@id", () => {
    const mismatched = calls
      .map(({ file, model, keys }) => {
        const declared = ids.get(model);
        if (!declared) return `${file}: no @@id found for model ${model}`;
        const sameSet =
          declared.length === keys.length &&
          declared.every((column) => keys.includes(column));
        return sameSet
          ? null
          : `${file} ${model}: keyFields [${keys.join(", ")}] vs @@id [${declared.join(", ")}]`;
      })
      .filter((problem): problem is string => problem !== null);
    expect(mismatched).toEqual([]);
  });
});
