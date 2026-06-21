import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract regression test for the change-history reader.
 *
 * The history pages read the shared `eve-builds` DB through
 * `apps/web/lib/history-actions.ts`, whose Prisma queries assume a specific
 * shape of `@jitaspace/db-history`'s schema. That schema mirrors the upstream
 * writer (jovespace); when the writer changes it, this repo's
 * `packages/db-history/prisma/schema.prisma` gets synced to match — and the
 * reader can silently break (PR #619 moved `Change` off `buildNumber` onto
 * `BuildDiff` + `diffId`; PR #627 fixed a crash that a changed relation caused).
 *
 * The unit tests in `historyActions.test.ts` mock the DB, so they cannot see
 * schema drift. This test parses the committed schema and asserts the exact
 * surface each reader depends on. If it fails, the db-history schema changed in
 * a way that affects the reader: update `history-actions.ts` AND these
 * assertions together, then run `pnpm db:generate` + `pnpm type-check` (the
 * complementary code↔generated-client guard).
 *
 * Scope: this catches drift in the committed schema file. It cannot detect the
 * live shared DB diverging from that file without a connection — that needs an
 * integration test against HISTORY_DATABASE_URL, which CI does not run.
 */

interface Field {
  type: string;
  optional: boolean;
  list: boolean;
}
type Models = Record<string, Record<string, Field>>;

const SCHEMA_PATH = join(
  __dirname,
  "../../../packages/db-history/prisma/schema.prisma",
);
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
const relation = (type: string): Field => ({ type, optional: false, list: false });

describe("db-history schema ↔ history-actions reader contract", () => {
  it("exposes exactly the expected models", () => {
    expect(Object.keys(models).sort()).toEqual([
      "Build",
      "BuildDiff",
      "Change",
      "Collection",
      "Entity",
      "FileChange",
    ]);
  });

  it("Op enum carries exactly the values the reader maps", () => {
    // history-actions `opKey` maps modified→changed; added/removed pass through.
    expect(parseEnumValues(schema, "Op").sort()).toEqual([
      "added",
      "modified",
      "removed",
    ]);
  });

  it("getHistoryIndex dependencies", () => {
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("Collection", "id")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
    expect(field("Change", "diffId")).toEqual(scalar("Int"));
    expect(field("Change", "collectionId")).toEqual(scalar("Int"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("Entity", "kind")).toEqual(scalar("String"));
    expect(field("Entity", "eveId")).toEqual(scalar("Int"));
    expect(field("BuildDiff", "id")).toEqual(scalar("Int"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
  });

  it("getBuildChanges dependencies", () => {
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("Change", "op")).toEqual(scalar("Op"));
    expect(field("Change", "data")).toEqual(scalar("Json"));
    expect(field("Change", "diff")).toEqual(relation("BuildDiff"));
    expect(field("Change", "entity")).toEqual(relation("Entity"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int")); // filtered via diff.toBuild
    expect(field("Entity", "kind")).toEqual(scalar("String"));
    expect(field("Entity", "eveId")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
  });

  it("getEntityTimeline dependencies (the PR #627 crash site)", () => {
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

  it("getResourceIndex dependencies", () => {
    expect(field("FileChange", "diffId")).toEqual(scalar("Int"));
    expect(field("FileChange", "op")).toEqual(scalar("Op"));
    expect(field("Change", "diffId")).toEqual(scalar("Int"));
    expect(field("Change", "collectionId")).toEqual(scalar("Int"));
    expect(field("Change", "op")).toEqual(scalar("Op"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("Collection", "id")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
    expect(field("Build", "buildNumber")).toEqual(scalar("Int"));
    expect(field("Build", "releasedAt")).toEqual(scalar("DateTime", true));
    expect(field("BuildDiff", "id")).toEqual(scalar("Int"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
  });

  it("getFileDiff dependencies", () => {
    expect(field("FileChange", "diff")).toEqual(relation("BuildDiff"));
    expect(field("FileChange", "path")).toEqual(scalar("String"));
    expect(field("FileChange", "op")).toEqual(scalar("Op"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
  });

  it("getStringChanges dependencies", () => {
    expect(field("Change", "op")).toEqual(scalar("Op"));
    expect(field("Change", "data")).toEqual(scalar("Json"));
    expect(field("Change", "diff")).toEqual(relation("BuildDiff"));
    expect(field("Change", "entity")).toEqual(relation("Entity"));
    expect(field("Change", "collection")).toEqual(relation("Collection"));
    expect(field("BuildDiff", "toBuild")).toEqual(scalar("Int"));
    expect(field("Entity", "eveId")).toEqual(scalar("Int"));
    expect(field("Collection", "name")).toEqual(scalar("String"));
  });
});
