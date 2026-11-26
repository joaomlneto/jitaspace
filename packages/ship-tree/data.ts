/**
 * Where the web app serves the library's data tables from.
 *
 * The library does not bundle its data: `DataProvider` fetches one JSONL file
 * per table from `<baseUrl>/<table>.jsonl` in the browser. The files ship
 * inside the npm package, and the web app copies them into this directory of
 * its `public/` when it builds (`apps/web/scripts/copy-ship-tree-data.mjs`).
 */
export const SHIP_TREE_DATA_BASE_URL = "/ship-tree-data";
