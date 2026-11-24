// Copies the ship tree's data tables into public/ship-tree-data, which git
// ignores, so that Next serves them as static files.
//
// The ship tree library (@eve-online-tools/eve-ship-tree, wrapped by
// @jitaspace/ship-tree) fetches its tables in the browser and ships them
// inside the npm package. The `dev` and `build` scripts run this first.
//
// Usage: node scripts/copy-ship-tree-data.mjs

import { cpSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolved from @jitaspace/ship-tree, the package that depends on the library.
const shipTree = createRequire(import.meta.resolve("@jitaspace/ship-tree"));
const tables = dirname(
  shipTree.resolve(
    "@eve-online-tools/eve-ship-tree/data/generated/types.jsonl",
  ),
);

cpSync(
  tables,
  fileURLToPath(new URL("../public/ship-tree-data", import.meta.url)),
  { recursive: true },
);
