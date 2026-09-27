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
 * Order is part of the contract, not just membership: the helper names the
 * compound input `keyFields.join("_")`, and Prisma derives that name from the
 * `@@id` declaration order — so `[typeId, characterId]` against an `@@id` of
 * `[characterId, typeId]` throws just as surely as a wrong column would.
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

const sdeJobSources = () =>
  fs
    .readdirSync(SDE_JOBS_DIR)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => ({
      file,
      source: fs.readFileSync(path.join(SDE_JOBS_DIR, file), "utf8"),
    }));

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

/**
 * The body of every `ingestSdeCompositeTable({ ... })` call, found by matching
 * braces rather than by the indent of the closing `})`: three call sites sit
 * deeper than the rest and an earlier indent-bound regex skipped all three
 * without failing anything.
 */
function compositeCallBodies(source: string): string[] {
  const bodies: string[] = [];
  const opener = "ingestSdeCompositeTable({";
  for (let at = source.indexOf(opener); at !== -1; ) {
    const start = at + opener.length;
    let depth = 1;
    let index = start;
    let quote: string | null = null;
    for (; index < source.length && depth > 0; index++) {
      const char = source[index]!;
      const next = source[index + 1];
      if (quote) {
        if (char === "\\") index++;
        else if (char === quote) quote = null;
        continue;
      }
      // Comments first: an apostrophe in prose ("CCP's") is not a quote.
      if (char === "/" && next === "/") {
        index = source.indexOf("\n", index);
        if (index === -1) break;
        continue;
      }
      if (char === "/" && next === "*") {
        index = source.indexOf("*/", index + 2) + 1;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") quote = char;
      else if (char === "{") depth++;
      else if (char === "}") depth--;
    }
    if (depth !== 0) throw new Error("unbalanced ingestSdeCompositeTable call");
    bodies.push(source.slice(start, index - 1));
    at = source.indexOf(opener, index);
  }
  return bodies;
}

/**
 * `const child = (delegate, rows, keyFields) => ingestSdeCompositeTable({...})`
 * — a local wrapper that takes both as parameters, so the pair to check lives at
 * its call sites instead. `ingestSdeNpcCorporations` writes six tables this way.
 */
function wrapperNames(source: string): string[] {
  return [
    ...source.matchAll(
      /const (\w+) = [^;]*?\) =>\s*ingestSdeCompositeTable\(\{/g,
    ),
  ].map((match) => match[1]!);
}

interface Call {
  file: string;
  model: string;
  keys: string[];
}

/** Every checkable (model, keyFields) pair, plus how it was accounted for. */
function compositeCalls(): {
  calls: Call[];
  inline: number;
  wrapperDefinitions: number;
  occurrences: number;
} {
  const calls: Call[] = [];
  let inline = 0;
  let wrapperDefinitions = 0;
  let occurrences = 0;

  const toModel = (delegate: string) =>
    delegate[0]!.toUpperCase() + delegate.slice(1);

  for (const { file, source } of sdeJobSources()) {
    occurrences += source.split("ingestSdeCompositeTable({").length - 1;

    for (const body of compositeCallBodies(source)) {
      const delegate = /delegate:\s*prisma\.(\w+)/.exec(body);
      const keyFields = /keyFields:\s*\[([\s\S]*?)\]/.exec(body);
      if (!delegate || !keyFields) {
        // A wrapper passes both through as identifiers; its callers are checked.
        wrapperDefinitions++;
        continue;
      }
      inline++;
      calls.push({
        file,
        // prisma.industryModifierSource -> IndustryModifierSource
        model: toModel(delegate[1]!),
        keys: [...keyFields[1]!.matchAll(/"(\w+)"/g)].map((m) => m[1]!),
      });
    }

    for (const name of wrapperNames(source)) {
      const callSite = new RegExp(
        String.raw`\b${name}\(\s*prisma\.(\w+),[\s\S]*?\[([^\]]*)\],?\s*\)`,
        "g",
      );
      for (const match of source.matchAll(callSite)) {
        calls.push({
          file,
          model: toModel(match[1]!),
          keys: [...match[2]!.matchAll(/"(\w+)"/g)].map((m) => m[1]!),
        });
      }
    }
  }

  return { calls, inline, wrapperDefinitions, occurrences };
}

describe("ingestSdeCompositeTable keyFields", () => {
  const ids = compositeIds();
  const { calls, inline, wrapperDefinitions, occurrences } = compositeCalls();

  it("accounts for every call site (guards the parsing above)", () => {
    // Exact, not a floor: a loose `> 20` let three skipped call sites pass.
    expect(inline + wrapperDefinitions).toBe(occurrences);
    expect(occurrences).toBeGreaterThan(80);
    // The wrapper's own call sites are checked in its place, so the pairs to
    // verify outnumber the inline calls.
    expect(calls.length).toBeGreaterThan(inline);
    expect(ids.size).toBeGreaterThan(20);
  });

  it("matches every call's keyFields to its model's @@id, in order", () => {
    const mismatched = calls
      .map(({ file, model, keys }) => {
        const declared = ids.get(model);
        if (!declared) return `${file}: no @@id found for model ${model}`;
        // Ordered: the compound input's name is `keyFields.join("_")`.
        const same =
          declared.length === keys.length &&
          declared.every((column, index) => keys[index] === column);
        return same
          ? null
          : `${file} ${model}: keyFields [${keys.join(", ")}] vs @@id [${declared.join(", ")}]`;
      })
      .filter((problem): problem is string => problem !== null);
    expect(mismatched).toEqual([]);
  });
});
