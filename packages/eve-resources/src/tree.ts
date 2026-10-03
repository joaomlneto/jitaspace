import type { ResourceEntry } from "./types";

/** A directory child that is itself a directory. */
export interface DirectoryChild {
  /** Last path segment, e.g. `staticdata`. */
  name: string;
  /** Full directory path, always ending in `/`, e.g. `res:/staticdata/`. */
  path: string;
}

/** The immediate children (subdirectories and files) of one directory. */
export interface DirectoryListing {
  /** The listed directory path, always ending in `/`. */
  path: string;
  directories: DirectoryChild[];
  files: ResourceEntry[];
}

interface DirectoryNode {
  subdirs: Set<string>;
  files: ResourceEntry[];
}

/**
 * A pre-built index over a flat list of {@link ResourceEntry}s that supports
 * cheap, lazy, per-directory navigation. Building this once (O(entries)) lets a
 * UI list one directory level at a time instead of shipping all ~120k entries
 * to the client.
 */
export interface ResourceTreeIndex {
  /** Exact-path lookup, used to resolve a file before fetching it. */
  byPath: Map<string, ResourceEntry>;
  /** Directory path (ending in `/`) → its immediate children. */
  directories: Map<string, DirectoryNode>;
}

function splitScheme(path: string): { scheme: string; rest: string } | null {
  const schemeEnd = path.indexOf(":/");
  if (schemeEnd === -1) return null;
  // Keep the trailing slash as part of the "root" directory key, e.g. `res:/`.
  return {
    scheme: path.slice(0, schemeEnd + 2),
    rest: path.slice(schemeEnd + 2),
  };
}

/** Normalize a directory path to always end with a single `/`. */
export function normalizeDirPath(path: string): string {
  if (path.length === 0) return "res:/";
  return path.endsWith("/") ? path : `${path}/`;
}

/** Build a {@link ResourceTreeIndex} from a flat list of resource entries. */
export function buildTreeIndex(entries: ResourceEntry[]): ResourceTreeIndex {
  const byPath = new Map<string, ResourceEntry>();
  const directories = new Map<string, DirectoryNode>();

  const ensureDir = (dir: string): DirectoryNode => {
    let node = directories.get(dir);
    if (!node) {
      node = { subdirs: new Set<string>(), files: [] };
      directories.set(dir, node);
    }
    return node;
  };

  for (const entry of entries) {
    byPath.set(entry.path, entry);

    const split = splitScheme(entry.path);
    if (!split) continue;

    const segments = split.rest.split("/");
    segments.pop(); // drop the filename; what's left are directory segments

    let dir = split.scheme;
    for (const segment of segments) {
      if (segment.length === 0) continue;
      ensureDir(dir).subdirs.add(segment);
      dir = `${dir}${segment}/`;
    }
    ensureDir(dir).files.push(entry);
  }

  return { byPath, directories };
}

/**
 * List the immediate children of a directory. Returns empty lists for an
 * unknown path. Subdirectories and files are sorted by name.
 */
export function listChildren(
  index: ResourceTreeIndex,
  path: string,
): DirectoryListing {
  const dir = normalizeDirPath(path);
  const node = index.directories.get(dir);
  if (!node) {
    return { path: dir, directories: [], files: [] };
  }

  const directories = [...node.subdirs]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, path: `${dir}${name}/` }));

  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));

  return { path: dir, directories, files };
}
