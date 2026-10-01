/**
 * Shapes and URL helpers for the per-string (`/string/[stringId]`) and per-file
 * (`/file/[...path]`) change-history pages. Both read the client-resource
 * history the ingestion pipeline records for every CDN-era build: localization
 * strings as `Change` rows in a `strings:<lang>` collection, client files as
 * `FileChange` rows.
 */

/** The server a build was first observed on; `null` for SDE-era builds. */
export type HistoryServer = "tranquility" | "singularity" | null;

/** One change to one language of a string, in one build. */
export interface StringEvent {
  build: number;
  /** Release date (YYYY-MM-DD), when known. */
  date: string | null;
  server: HistoryServer;
  /** Language code: "en-us", "de", "zh", … */
  lang: string;
  op: "added" | "changed" | "removed";
  /** The text before the build; absent when the string was added. */
  from?: string;
  /** The text after the build; absent when the string was removed. */
  to?: string;
}

export interface StringHistory {
  stringId: number;
  /** Languages with recorded changes, English first. */
  languages: string[];
  /** Oldest build first. */
  events: StringEvent[];
}

/** One change to a client file, in one Tranquility build. */
export interface FileEvent {
  build: number;
  date: string | null;
  op: "added" | "modified" | "removed";
  /** Uncompressed size in bytes after the build; null when removed. */
  size: number | null;
  /** MD5 of the contents after the build; null when removed or not indexed. */
  hash: string | null;
}

export interface FileHistory {
  path: string;
  /** Oldest build first; Tranquility builds only. */
  events: FileEvent[];
}

/** English first, then by language code. */
export function compareLanguages(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "en-us") return -1;
  if (b === "en-us") return 1;
  return a.localeCompare(b);
}

export function stringPageHref(stringId: number): string {
  return `/string/${stringId}`;
}

/** The schemes client file paths are written with: `res:/…` and `app:/…`. */
const FILE_SCHEMES = new Set(["res:", "app:"]);

/**
 * `/file/res:/ui/texture/icons/1_64_1.png` for `res:/ui/texture/icons/1_64_1.png`:
 * the path's own slashes become the route's segments, so URLs stay readable.
 * Each segment is percent-encoded except for the scheme's colon.
 */
export function filePageHref(path: string): string {
  return `/file/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment).replaceAll("%3A", ":"))
    .join("/")}`;
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * The file path a `/file/[...path]` URL names, or `null` when it does not
 * name one: it must start with a known scheme and have a non-empty path after
 * it. Segments arrive either decoded or percent-encoded depending on the
 * caller, so they are decoded defensively.
 */
export function parseFilePathSegments(
  segments: readonly string[] | undefined,
): string | null {
  if (!segments || segments.length < 2) return null;
  const decoded = segments.map(decodeSegment);
  if (decoded.some((segment) => segment === null || segment === ""))
    return null;
  const [scheme, ...rest] = decoded as string[];
  if (!scheme || !FILE_SCHEMES.has(scheme.toLowerCase())) return null;
  return `${scheme.toLowerCase()}/${rest.join("/")}`;
}

/** "1.4 MB", "830 B" — binary multiples, as file sizes usually are. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: value < 10 ? 1 : 0,
  })} ${units[unit]}`;
}
