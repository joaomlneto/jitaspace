import type { EveServer } from "./constants";

/**
 * A single entry in an EVE resource index (either the app index or the
 * resfile index). Both indexes share the same comma-separated line format;
 * the app index additionally carries a unix file mode as a 6th column.
 */
export interface ResourceEntry {
  /** Virtual path, e.g. `res:/ui/texture/foo.dds` or `app:/resfileindex.txt`. */
  path: string;
  /** CDN-relative hashed path, e.g. `72/7262b56fef44400b_fab251db16cb48c80e9d222780f1b257`. */
  relPath: string;
  /** MD5 of the uncompressed file contents, lowercase hex. */
  md5: string;
  /** Uncompressed size in bytes — this is what the CDN actually serves. */
  size: number;
  /** Compressed size recorded in the index (launcher delta-patching metadata). */
  compressedSize: number;
  /** Unix file mode (present in the app index only). */
  mode?: number;
}

/** A fully-resolved resource index for a given build. */
export interface ResourceIndex {
  server: EveServer;
  /** Build number this index belongs to, e.g. `"3368760"`. */
  build: string;
  /** Every `res:/` file in the build. */
  entries: ResourceEntry[];
}
