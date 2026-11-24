import { readdirSync, readFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { dirname, join } from "node:path";

/** The installed library's own data directory. */
const LIBRARY_TABLES = join(
  dirname(
    findPackageJSON(
      "@eve-online-tools/eve-ship-tree",
      join(process.cwd(), "noop.js"),
    ) ?? "",
  ),
  "dist",
  "data",
  "generated",
);

/** A table as the library ships it, or `null` if it ships no such file. */
export function readLibraryTable(name: string): string | null {
  try {
    return readFileSync(join(LIBRARY_TABLES, name), "utf8");
  } catch {
    return null;
  }
}

/**
 * A `fetch` that answers the way the web app does, serving the real tables out
 * of the installed library, and records what was asked for.
 *
 * Returns the minimal response surface the library's loader reads, rather than
 * a `Response`: jsdom has none.
 */
export function createFakeFetch() {
  const requested: string[] = [];

  const fakeFetch = (input: unknown): Promise<unknown> => {
    const url = String(input);
    requested.push(url);
    const body = readLibraryTable(fileName(url));
    return Promise.resolve({
      ok: body !== null,
      status: body === null ? 404 : 200,
      statusText: body === null ? "Not Found" : "OK",
      headers: { get: () => null },
      text: () => Promise.resolve(body ?? ""),
    });
  };

  return { fetch: fakeFetch as typeof fetch, requested };
}

/** Orders strings alphabetically; `Array#sort` without one compares UTF-16 code units. */
export const byName = (a: string, b: string) => a.localeCompare(b);

/** The file a data URL points at: everything after the last `/`. */
export const fileName = (url: string) => url.split("/").pop() ?? "";

/** The tables the library loads: its data directory, less its own index of it. */
export const ALL_TABLE_FILES = readdirSync(LIBRARY_TABLES)
  .filter((name) => name !== "staticDataFiles.jsonl")
  .sort(byName);
