/**
 * Vercel's Ignored Build Step for the gallery (`ignoreCommand` in vercel.json).
 * Exit 0 skips the deployment, exit 1 builds it. It runs before `pnpm install`,
 * so it imports nothing but Node built-ins, and Node 24 runs it as TypeScript
 * directly (type stripping): keep to erasable syntax.
 *
 * The gallery is a static export of @jitaspace/eve-icons, so it builds only
 * when something that reaches `out/` changed since the branch's last
 * successful deployment:
 *
 * - a tracked file of the gallery, of @jitaspace/eve-icons or of
 *   @jitaspace/tsconfig, other than docs, lint and test files;
 * - a field of their package.json other than lint, format and test tooling;
 * - the version pnpm-lock.yaml resolves for one of their direct dependencies,
 *   other than that same tooling;
 * - turbo.json, which decides what `turbo run build` runs.
 *
 * `turbo query affected`, which this replaces, also counted the dev-only
 * workspaces @jitaspace/eslint-config and @jitaspace/prettier-config and their
 * whole lockfile closure (typescript-eslint, every ESLint plugin, Next's lint
 * plugin), so nearly every dependency bump rebuilt the gallery, and so did
 * every branch that merged one in from main.
 *
 * Not covered: a transitive dependency that changes while every direct one
 * keeps its version. The output is plain HTML, JS and PNG, so such a change
 * waits for the next build that is needed anyway.
 *
 * Anything unexpected (no base commit, git failing, a lockfile entry that is
 * missing) builds: a wasted build is cheaper than a stale site.
 *
 * Try it locally:  node apps/eve-icons-gallery/scripts/ignore-build.ts <base> [<head>]
 */
import { execFileSync } from "node:child_process";

const BUILD = 1;
const SKIP = 0;

type Decision = [code: typeof BUILD | typeof SKIP, reason: string];

/** Workspaces whose files reach the build, with the files that do not. */
const WORKSPACES: Record<string, RegExp[]> = {
  "apps/eve-icons-gallery": [/^README\.md$/, /^eslint\.config\.ts$/],
  "packages/eve-icons": [
    /^README\.md$/,
    /^LICENSE$/,
    /^eslint\.config\.ts$/,
    /^jest\.(config|setup)\.ts$/,
    /^tests\//,
    // Refreshes assets/ from the game client; the PNGs it writes are inputs.
    /^scripts\/sync\.ts$/,
  ],
  "tooling/tsconfig": [/^README\.md$/],
};

/** Root files that are build inputs (package.json and the lockfile aside). */
const ROOT_INPUTS = new Set(["turbo.json"]);

/** Dependencies used only to lint, format, test or publish, never to build. */
const TOOLING_ONLY = new Set([
  "@jest/globals",
  "@jitaspace/eslint-config",
  "@jitaspace/eve-resources", // scripts/sync.ts only
  "@jitaspace/prettier-config",
  "@swc/core",
  "@swc/jest",
  "@testing-library/jest-dom",
  "@testing-library/react",
  "@types/jest",
  "eslint",
  "jest",
  "jest-environment-jsdom",
  "prettier",
  "tsup", // build:package, for publishing to npm
]);

/** package.json scripts that the gallery's build never runs. */
const TOOLING_SCRIPTS = new Set([
  "build:package",
  "clean",
  "icons:sync",
  "lint",
  "lint:fix",
  "prepack",
  "test",
  "test:watch",
]);

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

const git = (...args: string[]): string =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

/** Contents of `path` at `rev`, or undefined if it does not exist there. */
const show = (rev: string, path: string): string | undefined => {
  try {
    return git("show", `${rev}:${path}`);
  } catch {
    return undefined;
  }
};

const isCommit = (rev: string): boolean => {
  try {
    git("cat-file", "-e", `${rev}^{commit}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Vercel clones only the last few commits. Once most pushes are skipped, the
 * branch's last successful deployment soon falls outside that window, so fetch
 * that one commit: a diff needs the two trees, not the history between them.
 */
const ensureCommit = (rev: string): boolean => {
  if (isCommit(rev)) return true;
  /* eslint-disable turbo/no-undeclared-env-vars -- Vercel system variables, read before any turbo task runs */
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  /* eslint-enable turbo/no-undeclared-env-vars */
  const remotes = ["origin"];
  if (owner && slug) remotes.push(`https://github.com/${owner}/${slug}.git`);
  for (const remote of remotes) {
    try {
      git("fetch", "--quiet", "--no-tags", "--depth=1", remote, rev);
      if (isCommit(rev)) return true;
    } catch {
      // try the next remote
    }
  }
  return false;
};

const omit = (
  record: Record<string, unknown>,
  keys: Set<string>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)));

/** The parts of a package.json that can change the build. */
const manifestInputs = (text: string | undefined): string | undefined => {
  if (text === undefined) return undefined;
  const manifest = JSON.parse(text) as Record<string, unknown>;
  delete manifest.prettier;
  delete manifest.description;
  for (const field of [...DEPENDENCY_FIELDS, "scripts"]) {
    const value = manifest[field];
    if (typeof value !== "object" || value === null) continue;
    manifest[field] = omit(
      value as Record<string, unknown>,
      field === "scripts" ? TOOLING_SCRIPTS : TOOLING_ONLY,
    );
  }
  return JSON.stringify(manifest);
};

/**
 * The versions pnpm-lock.yaml resolves for a workspace's direct dependencies,
 * read from its `importers:` entry:
 *
 *   importers:
 *     apps/eve-icons-gallery:
 *       dependencies:
 *         next:
 *           specifier: 16.4.5
 *           version: 16.4.5(@opentelemetry/api@1.9.1)(...)
 *
 * The version carries the resolved peers too, so a peer change shows here. A
 * workspace with no dependencies is written `  tooling/tsconfig: {}`.
 */
const lockfileInputs = (
  lockfile: string | undefined,
  workspace: string,
): string | undefined => {
  if (lockfile === undefined) return undefined;
  const lines = lockfile.split("\n");
  if (lines.includes(`  ${workspace}: {}`)) return "[]";
  const start = lines.indexOf(`  ${workspace}:`);
  if (start === -1) return undefined;
  const versions: Record<string, string> = {};
  let name: string | undefined;
  for (const line of lines.slice(start + 1)) {
    if (line !== "" && !line.startsWith("   ")) break; // next importer
    const dependency = /^ {6}'?([^':]+)'?:$/.exec(line);
    if (dependency) name = dependency[1];
    const version = /^ {8}version: (.+)$/.exec(line)?.[1];
    if (version && name && !TOOLING_ONLY.has(name)) versions[name] = version;
  }
  return JSON.stringify(Object.entries(versions).sort());
};

const decide = (base: string, head: string): Decision => {
  if (!ensureCommit(base)) return [BUILD, `base ${base} is not available`];

  const changed = git("diff", "--name-only", "--no-renames", base, head)
    .split("\n")
    .filter(Boolean);

  for (const file of changed) {
    if (ROOT_INPUTS.has(file)) return [BUILD, `${file} changed`];
    for (const [workspace, ignored] of Object.entries(WORKSPACES)) {
      if (!file.startsWith(`${workspace}/`)) continue;
      const relative = file.slice(workspace.length + 1);
      if (relative === "package.json") continue; // compared below
      if (ignored.some((pattern) => pattern.test(relative))) continue;
      return [BUILD, `${file} changed`];
    }
  }

  for (const workspace of Object.keys(WORKSPACES)) {
    const path = `${workspace}/package.json`;
    if (!changed.includes(path)) continue;
    if (manifestInputs(show(base, path)) !== manifestInputs(show(head, path))) {
      return [BUILD, `${path} changed a build input`];
    }
  }

  if (changed.includes("pnpm-lock.yaml")) {
    const before = show(base, "pnpm-lock.yaml");
    const after = show(head, "pnpm-lock.yaml");
    for (const workspace of Object.keys(WORKSPACES)) {
      const was = lockfileInputs(before, workspace);
      const is = lockfileInputs(after, workspace);
      if (is === undefined || was !== is) {
        return [BUILD, `pnpm-lock.yaml changed a dependency of ${workspace}`];
      }
    }
  }

  return [SKIP, `none of the ${changed.length} changed files reach the build`];
};

const [argBase, argHead = "HEAD"] = process.argv.slice(2);
// Empty on a branch's first deployment: compare with the parent commit then.
// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vercel system variable, see ensureCommit
const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const base =
  argBase ?? (previous === undefined || previous === "" ? "HEAD^" : previous);

let decision: Decision;
try {
  decision = decide(base, argHead);
} catch (error) {
  const message = error instanceof Error ? error.message.trim() : String(error);
  decision = [BUILD, `could not decide (${message})`];
}
const [code, reason] = decision;
console.log(
  `${code === BUILD ? "Building" : "Skipping"} the gallery: ${reason} (${base}..${argHead}).`,
);
process.exit(code);
