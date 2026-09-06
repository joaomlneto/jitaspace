/**
 * Every file the SDE registry knows about must actually be read by a job.
 *
 * The registry and the jobs drifted apart once already: CCP added 23 files in
 * build 3475087 and nothing noticed, because `loadFile` is registry-first — it
 * throws for a file we ASK for and never learns about one we don't. That half of
 * the gap is caught at run time by the drift check in `ingest-sde-all`, which
 * compares the extracted archive against the registry. This test catches the
 * other half, which needs no archive and so can run in CI: a filename registered
 * but loaded by nothing.
 *
 * Both files are read as TEXT rather than imported: `@jitaspace/sde-utils` uses
 * `.js`-extension specifiers that jest cannot resolve, which is why
 * `registry.test.ts` mocks the module away entirely.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const SDE_JOBS_DIR = path.join(__dirname, "..", "jobs", "scrape", "sde");
const REGISTRY = path.join(
  __dirname,
  "..",
  "..",
  "sde-utils",
  "src",
  "sources",
  "sde.ts",
);

/** Filenames the ingest pipeline is not expected to read. */
const NOT_INGESTED = new Set([
  // Archive metadata: the build number, read by `ingest-sde-all` itself to stamp
  // the run. It has no table and never will.
  "_sde.yaml",
]);

const registeredFiles = [
  ...new Set(
    [
      ...fs.readFileSync(REGISTRY, "utf8").matchAll(/^\s*"([\w]+\.yaml)":/gm),
    ].map((match) => match[1]!),
  ),
];

const jobSources = fs
  .readdirSync(SDE_JOBS_DIR)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => fs.readFileSync(path.join(SDE_JOBS_DIR, name), "utf8"))
  .join("\n");

describe("sdeInputFiles coverage", () => {
  it("registers a non-trivial number of files", () => {
    // Guards the regex above: a parse that silently matched nothing would make
    // every other assertion here vacuous.
    expect(registeredFiles.length).toBeGreaterThan(90);
  });

  it("has a job reading every registered file", () => {
    const unread = registeredFiles.filter(
      (file) => !NOT_INGESTED.has(file) && !jobSources.includes(`"${file}"`),
    );
    expect(unread).toEqual([]);
  });

  it("registers every file the jobs ask for", () => {
    // The inverse: a job naming a file the registry lacks would throw
    // `File X not found in sdeInputFiles` at run time, on a job that may only
    // run weekly.
    const asked = [
      ...new Set(
        [...jobSources.matchAll(/"([\w]+\.yaml)"/g)].map((match) => match[1]!),
      ),
    ];
    expect(asked.filter((file) => !registeredFiles.includes(file))).toEqual([]);
  });
});
