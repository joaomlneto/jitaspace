import { readFileSync } from "node:fs";
import { describe, expect, it } from "@jest/globals";

/**
 * Schema-contract regression test for the change-history reader.
 *
 * The history pages read the shared `eve-builds` DB through
 * `apps/web/lib/history-cache.ts` and `app/history/build/[build]/data.ts`,
 * whose Prisma queries assume a specific shape of `@jitaspace/db-builds`'s
 * schema. That package is published to npm by the upstream writer (jovespace),
 * which owns the schema; a version bump here (Renovate) can change it, and the
 * reader can silently break (PR #619 moved `Change` off `buildNumber` onto
 * `BuildDiff` + `diffId`; PR #627 fixed a crash that a changed relation caused).
 *
 * The unit tests in `historyActions.test.ts` mock the DB, so they cannot see
 * schema drift. This test parses the schema the installed package ships and
 * asserts the exact surface each reader depends on. If it fails, the
 * db-builds schema changed in a way that affects the reader: update the reader
 * AND these assertions together, then run `pnpm type-check` (the complementary
 * code↔client guard: the package ships its generated client's types).
 *
 * Scope: this catches drift in the published schema. It cannot detect the live
 * shared DB diverging from that schema without a connection — that needs an
 * integration test against EVE_BUILDS_DATABASE_URL, which CI does not run.
 */

interface Field {
  type: string;
  optional: boolean;
  list: boolean;
}
type Models = Record<string, Record<string, Field>>;

const SCHEMA_PATH = require.resolve("@jitaspace/db-builds/schema.prisma");
const schema = readFileSync(SCHEMA_PATH, "utf8");

/** Minimal Prisma-schema parser: model → field → {type, optional, list}. */
function parseModels(src: string): Models {
  const models: Models = {};
  for (const match of src.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\}/g)) {
    const name = match[1];
    const body = match[2];
    if (!name || body === undefined) continue;
    const fields: Record<string, Field> = {};
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      // Skip blank lines, block attributes (@@index/@@unique) and comments.
      if (!line || line.startsWith("@@") || line.startsWith("//")) continue;
      const [fname, ftype] = line.split(/\s+/);
      if (!fname || !ftype) continue;
      fields[fname] = {
        type: ftype.replace(/[?[\]]/g, ""),
        optional: ftype.endsWith("?"),
        list: ftype.endsWith("[]"),
      };
    }
    models[name] = fields;
  }
  return models;
}

function parseEnumValues(src: string, name: string): string[] {
  const m = new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\}`).exec(src);
  if (!m?.[1]) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"));
}

const models = parseModels(schema);

/** Field descriptor, or null so a missing field fails `toEqual` with a clear diff. */
const field = (model: string, name: string): Field | null =>
  models[model]?.[name] ?? null;

const scalar = (type: string, optional = false): Field => ({
  type,
  optional,
  list: false,
});
const relation = (type: string): Field => ({
  type,
  optional: false,
  list: false,
});

describe("db-builds schema ↔ history reader contract", () => {
  // The writer owns the schema and may add models only it uses (e.g.
  // IconReference), so require the reader's models rather than an exact set.
  it("declares every model the reader uses", () => {
    expect(Object.keys(models)).toEqual(
      expect.arrayContaining([
        "Build",
        "BuildDiff",
        "Change",
        "Collection",
        "Entity",
        "FileChange",
      ]),
    );
  });

  it("Op enum carries exactly the values the reader maps", () => {
    // The build page's `opKey` maps modified→changed; added/removed pass through.
    expect(parseEnumValues(schema, "Op").sort()).toEqual([
      "added",
      "modified",
      "removed",
    ]);
  });

  it("getCachedHistoryIndex dependencies", () => {
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("Collection", "id")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
    expect(field("Change", "diffId")).toEqual(scalar("Int"));
    expect(field("Change", "collectionId")).toEqual(scalar("Int"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    // The index counts entities per kind via groupBy(["kind"]) — it reads
    // Entity.kind but no longer each Entity.eveId.
    expect(field("Entity", "kind")).toEqual(scalar("String"));
    expect(field("BuildDiff", "id")).toEqual(scalar("Int"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
  });

  it("getCachedEntityTimeline dependencies (the PR #627 crash site)", () => {
    expect(field("Change", "diffId")).toEqual(scalar("Int"));
    expect(field("Change", "op")).toEqual(scalar("Op"));
    expect(field("Change", "data")).toEqual(scalar("Json"));
    expect(field("Change", "entity")).toEqual(relation("Entity"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("Change", "diff")).toEqual(relation("BuildDiff")); // orderBy diff.toBuild
    expect(field("BuildDiff", "id")).toEqual(scalar("Int"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("Entity", "kind")).toEqual(scalar("String"));
    expect(field("Entity", "eveId")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
  });

  it("getCachedBuildPage dependencies", () => {
    // scope gate
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("Build", "server")).toEqual(scalar("Server", true));
    // entity + localization-string changes, filtered via diff.toBuild
    expect(field("Change", "op")).toEqual(scalar("Op"));
    expect(field("Change", "data")).toEqual(scalar("Json"));
    expect(field("Change", "diff")).toEqual(relation("BuildDiff"));
    expect(field("Change", "entity")).toEqual(relation("Entity"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
    expect(field("Entity", "kind")).toEqual(scalar("String"));
    expect(field("Entity", "eveId")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
    // raw resource files
    expect(field("FileChange", "diff")).toEqual(relation("BuildDiff"));
    expect(field("FileChange", "path")).toEqual(scalar("String"));
    expect(field("FileChange", "op")).toEqual(scalar("Op"));
  });
});
