import type { ResourceEntry } from "./types";

/**
 * Parse the text body of an EVE resource index (the app index or the resfile
 * index) into structured entries.
 *
 * Each non-empty line looks like:
 *
 * ```
 * res:/ui/texture/foo.dds,72/7262..._fab2...,fab2...,26444,8827
 * app:/resfileindex.txt,d5/d5f9..._0b7b...,0b7b...,1535120,544073,33188
 * ```
 *
 * Columns: `virtualPath, hashedRelPath, md5, uncompressedSize, compressedSize[, mode]`.
 *
 * The parser is tolerant: blank lines and malformed lines (fewer than 4
 * columns) are skipped rather than throwing.
 */
export function parseResourceIndex(text: string): ResourceEntry[] {
  const entries: ResourceEntry[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const [
      path = "",
      relPath = "",
      md5 = "",
      sizeText = "",
      compressedSizeText = "",
      modeText,
    ] = line.split(",");

    if (path.length === 0 || relPath.length === 0) continue;

    const entry: ResourceEntry = {
      path,
      relPath,
      md5,
      size: Number.parseInt(sizeText, 10) || 0,
      compressedSize: Number.parseInt(compressedSizeText, 10) || 0,
    };

    if (modeText !== undefined && modeText.length > 0) {
      entry.mode = Number.parseInt(modeText, 10) || 0;
    }

    entries.push(entry);
  }

  return entries;
}
