#!/usr/bin/env node
/**
 * Rewrite lcov `SF:` source paths to be repo-root-relative.
 *
 * Each package's Jest run emits coverage with paths relative to the package
 * (e.g. `SF:DataTable/DataTable.tsx`). In a monorepo this is ambiguous —
 * `datatable-tanstack` and `datatable-mantine` both produce
 * `SF:DataTable/DataTable.tsx`, so SonarCloud cannot tell which source file the
 * coverage belongs to and mis-reports new-code coverage. Prefixing the package
 * path makes each `SF:` unique and resolvable from the repo root.
 *
 * Usage: node ../../scripts/prefix-lcov-paths.mjs <package-path> [lcov-file]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const prefix = process.argv[2];
const file = process.argv[3] ?? "coverage/lcov.info";

if (!prefix) {
  console.error("usage: prefix-lcov-paths <package-path-prefix> [lcov-file]");
  process.exit(1);
}

// No coverage produced (e.g. a filtered run) — nothing to rewrite.
if (!existsSync(file)) process.exit(0);

const rewritten = readFileSync(file, "utf8")
  .split("\n")
  .map((line) => {
    if (!line.startsWith("SF:")) return line;
    const path = line.slice(3);
    // Idempotent: leave already-prefixed paths untouched.
    return path.startsWith(`${prefix}/`) ? line : `SF:${prefix}/${path}`;
  })
  .join("\n");

writeFileSync(file, rewritten);
