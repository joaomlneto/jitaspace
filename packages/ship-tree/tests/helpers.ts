import { SHIP_TREE_DATA_FILE_NAMES } from "../data";
import { readShipTreeDataFile } from "../server";

/**
 * A `fetch` that answers the way the web app's data route does, serving the
 * real tables out of the installed library, and records what was asked for.
 *
 * Returns the minimal response surface the library's loader reads, rather than
 * a `Response`: jsdom has none.
 */
export function createFakeFetch() {
  const requested: string[] = [];

  const fakeFetch = async (input: unknown): Promise<unknown> => {
    const url = String(input);
    requested.push(url);
    const body = await readShipTreeDataFile(url.split("/").pop() ?? "");
    return {
      ok: body !== null,
      status: body === null ? 404 : 200,
      statusText: body === null ? "Not Found" : "OK",
      headers: { get: () => null },
      text: () => Promise.resolve(body ?? ""),
    };
  };

  return { fetch: fakeFetch as typeof fetch, requested };
}

export const ALL_TABLE_FILES = [...SHIP_TREE_DATA_FILE_NAMES].sort();
