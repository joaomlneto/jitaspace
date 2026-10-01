import { readFile } from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { dirname, join } from "node:path";

import { isShipTreeDataFileName } from "./data";

export { isShipTreeDataFileName, SHIP_TREE_DATA_FILE_NAMES } from "./data";
export type { ShipTreeDataFileName } from "./data";

const LIBRARY = "@eve-online-tools/eve-ship-tree";

/**
 * Where the installed library keeps its tables: `dist/data/generated`, the
 * target of its `./data/generated/*` export.
 *
 * Resolution starts from the working directory (`apps/web` under Next), which
 * sees the package wherever the package manager hoisted it. It goes through
 * `findPackageJSON` rather than `require.resolve` on purpose: Next's bundler
 * analyses `require.resolve`, expands a templated specifier into a glob over
 * every file in the directory, and fails the build trying to bundle each
 * `.jsonl` as a module. `findPackageJSON` is opaque to it.
 */
function dataDirectory(): string {
  const manifest = findPackageJSON(LIBRARY, join(process.cwd(), "noop.js"));
  if (!manifest) throw new Error(`Cannot locate ${LIBRARY}; is it installed?`);
  return join(dirname(manifest), "dist", "data", "generated");
}

/**
 * Reads one of the library's JSONL data tables out of the installed npm
 * package. Server-only: this touches the filesystem.
 *
 * Returns `null` for any name that is not one of the library's tables, which is
 * what keeps a URL segment like `../../.env` from ever reaching `readFile`.
 */
export async function readShipTreeDataFile(
  fileName: string,
): Promise<string | null> {
  if (!isShipTreeDataFileName(fileName)) return null;
  return readFile(join(dataDirectory(), fileName), "utf8");
}
