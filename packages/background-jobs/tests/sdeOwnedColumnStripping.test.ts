/**
 * Every diff against a table the SDE co-owns must exclude that table's
 * SDE-owned columns.
 *
 * `updateTable` decides "modified" by walking the keys of the *local* row, so a
 * column the remote (ESI) side never supplies compares `value` against
 * `undefined` and reports every row as changed. Nothing is lost — the `update`
 * passes the remote row, so Prisma leaves the omitted columns alone — which is
 * exactly why it stays invisible: the job succeeds, the data stays right, and
 * the only symptom is an UPDATE per row on every run. At 40,928 asteroid belts
 * and 8,089 stars that is a standing write load for no change at all.
 *
 * The `SDE_OWNED_*_COLUMNS` lists exist to prevent this, but declaring one does
 * nothing on its own — it has to be spread at *every* site that diffs the table,
 * and four sites were missed at four separate times (asteroid belts, stars, and
 * NPC-CEO characters in both corporation scrapers). This test is the check that
 * the lists are actually applied.
 *
 * A site may satisfy the invariant three ways, all of which appear here:
 *   - spreading the list into `excludeObjectKeys`, inline or via a named helper;
 *   - narrowing the read with `select:` so the columns never load;
 *   - not existing, because the code is commented out.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.join(__dirname, "..");
const OWNED_COLUMNS = path.join(ROOT, "helpers", "sdeOwnedColumns.ts");

/**
 * Comments and string bodies removed, so prose apostrophes and commented-out
 * code cannot be mistaken for live source. Lengths are not preserved; only the
 * text that remains is used.
 */
function stripCommentsAndStrings(source: string): string {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    const next = source[i + 1];
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      if (end === -1) break;
      i = end - 1;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 1;
    } else if (char === '"' || char === "'" || char === "`") {
      // Keep the quotes so `excludeObjectKeys(entry, [...])` still parses, but
      // drop the body — no identifier we look for lives inside one.
      out += char;
      for (i++; i < source.length && source[i] !== char; i++) {
        if (source[i] === "\\") i++;
      }
      out += char;
    } else {
      out += char;
    }
  }
  return out;
}

function sourceFiles(): { file: string; source: string }[] {
  const files: { file: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        files.push({
          file: path.relative(ROOT, full),
          source: fs.readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(path.join(ROOT, "jobs"));
  walk(path.join(ROOT, "helpers"));
  return files;
}

/** `asteroidBelt` -> `SDE_OWNED_ASTEROID_BELT_COLUMNS`. */
const listNameFor = (model: string) =>
  `SDE_OWNED_${model.replace(/(?!^)([A-Z])/g, "_$1").toUpperCase()}_COLUMNS`;

const declaredLists = new Set(
  [
    ...fs
      .readFileSync(OWNED_COLUMNS, "utf8")
      .matchAll(/export const (SDE_OWNED_[A-Z_]+_COLUMNS)/g),
  ].map((match) => match[1]!),
);

interface Site {
  file: string;
  model: string;
  block: string;
  source: string;
}

/**
 * Every `fetchLocalEntries` block, paired with the model it reads.
 *
 * A handful name no model at all and cannot be checked here: the two generic
 * ingest helpers take their `delegate` as a parameter, and two jobs diff against
 * an already-materialised array. They are counted rather than skipped, so a site
 * that stops resolving for some *other* reason still fails the count below.
 */
function localDiffSites(): { sites: Site[]; unresolvable: number } {
  const sites: Site[] = [];
  let unresolvable = 0;
  for (const { file, source: raw } of sourceFiles()) {
    const source = stripCommentsAndStrings(raw);
    for (const match of source.matchAll(/fetchLocalEntries:/g)) {
      // Every site in this package orders the two properties this way; the
      // count assertion below fails if that ever stops being true.
      const end = source.indexOf("fetchRemoteEntries:", match.index);
      const block = end === -1 ? "" : source.slice(match.index, end);
      const model = /prisma\.(\w+)/.exec(block);
      if (model) sites.push({ file, model: model[1]!, block, source });
      else unresolvable++;
    }
  }
  return { sites, unresolvable };
}

/** Live `fetchLocalEntries:` occurrences, as a plain count to measure against. */
function liveOccurrences(): number {
  return sourceFiles().reduce(
    (total, { source }) =>
      total +
      stripCommentsAndStrings(source).split("fetchLocalEntries:").length -
      1,
    0,
  );
}

describe("SDE-owned columns are stripped wherever the table is diffed", () => {
  const { sites, unresolvable } = localDiffSites();

  it("finds every diff site (guards the parsing above)", () => {
    // Exact: a site the parser silently drops is a table it never checks.
    expect(sites.length + unresolvable).toBe(liveOccurrences());
    expect(unresolvable).toBe(4);
    expect(sites.length).toBeGreaterThan(35);
    expect(declaredLists.size).toBeGreaterThan(15);
  });

  it("excludes them at every site that diffs a co-owned table", () => {
    const unstripped = sites
      .filter(({ model }) => declaredLists.has(listNameFor(model)))
      .filter(({ block, source }) => {
        const list = listNameFor(/prisma\.(\w+)/.exec(block)![1]!);
        if (block.includes(list)) return false;
        // A narrowing `select:` keeps the columns from ever loading.
        if (/\bselect:\s*\{/.test(block)) return false;
        // Or a named helper in the same file spreads the list for us.
        return ![...block.matchAll(/\b([a-z]\w*)\)/g)].some(([, name]) => {
          const helper = new RegExp(
            String.raw`const ${name} =[\s\S]*?\n\n`,
          ).exec(source);
          return helper?.[0].includes(list) ?? false;
        });
      })
      .map(({ file, model }) => `${file}: ${model} (${listNameFor(model)})`);
    expect(unstripped).toEqual([]);
  });
});
