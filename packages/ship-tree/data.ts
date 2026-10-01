import type { DataTableName } from "@eve-online-tools/eve-ship-tree";

/**
 * Where the web app serves the library's data tables from.
 *
 * The library does not bundle its data: `DataProvider` fetches one JSONL file
 * per table from `<baseUrl>/<table>.jsonl` in the browser. The files ship
 * inside the npm package, and the web app exposes them under this path (see
 * `readShipTreeDataFile` in `./server`) rather than copying them into the
 * repository or `public/`.
 */
export const SHIP_TREE_DATA_BASE_URL = "/api/ship-tree-data";

/**
 * The tables the library loads, one `<table>.jsonl` file each.
 *
 * The library keeps this list to itself, so it is restated here. Typing it as
 * a `Record` over the library's exported `DataTableName` makes a version bump
 * that adds or drops a table a type error in this file, instead of a 404 (or a
 * silently unserved table) in production.
 */
const TABLES = {
  certificates: true,
  cloneGrades: true,
  factions: true,
  groups: true,
  masteries: true,
  requiredSkills: true,
  shipSizes: true,
  shipTreeElements: true,
  shipTreeFactions: true,
  shipTreeGroups: true,
  typeBonus: true,
  typeElements: true,
  types: true,
} satisfies Record<DataTableName, true>;

export type ShipTreeDataFileName = `${DataTableName}.jsonl`;

export const SHIP_TREE_DATA_FILE_NAMES = (
  Object.keys(TABLES) as DataTableName[]
).map((table): ShipTreeDataFileName => `${table}.jsonl`);

/**
 * Whether `value` names one of the library's data files.
 *
 * The data route takes the file name from the URL, so this is also the guard
 * that keeps anything else, `../` included, away from the filesystem.
 */
export function isShipTreeDataFileName(
  value: string,
): value is ShipTreeDataFileName {
  return (SHIP_TREE_DATA_FILE_NAMES as readonly string[]).includes(value);
}
