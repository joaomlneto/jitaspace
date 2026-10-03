/**
 * Generic structural inspection for *any* binary file — the universal fallback
 * so every resource has at least a meaningful preview (size, magic bytes, a hex
 * dump, and any embedded ASCII strings).
 */

export interface BinaryInspection {
  /** True size of the file in bytes (may exceed {@link sampledBytes}). */
  byteLength: number;
  /** How many leading bytes were actually examined. */
  sampledBytes: number;
  /** Fraction of sampled bytes that are printable ASCII / whitespace. */
  printableRatio: number;
  /** First four bytes as printable ASCII (`·` for non-printable). */
  magicAscii: string;
  /** First four bytes as hex. */
  magicHex: string;
  /** A classic `offset  hex  ascii` dump of the first {@link hexDumpBytes} bytes. */
  hexDump: string;
  /** Number of bytes shown in {@link hexDump}. */
  hexDumpBytes: number;
  /** Distinct printable ASCII runs (≥ 4 chars), in order of first appearance. */
  strings: string[];
}

function isPrintable(b: number): boolean {
  return b >= 32 && b < 127;
}

function isTextByte(b: number): boolean {
  return b === 9 || b === 10 || b === 13 || isPrintable(b);
}

/**
 * Summarize a byte buffer for display. Pass the file's true size as
 * `totalSize` when `bytes` is only a leading slice (e.g. a ranged fetch).
 */
export function inspectBinary(
  bytes: Uint8Array,
  totalSize: number = bytes.length,
  hexDumpBytes = 256,
  maxStrings = 80,
): BinaryInspection {
  const asciiOf = (b: number): string =>
    isPrintable(b) ? String.fromCharCode(b) : "·";
  const hexOf = (b: number): string => b.toString(16).padStart(2, "0");

  let printable = 0;
  for (const b of bytes) if (isTextByte(b)) printable++;

  const magicAscii = Array.from(bytes.subarray(0, 4), asciiOf).join("");
  const magicHex = Array.from(bytes.subarray(0, 4), hexOf).join(" ");

  // Hex dump: 16 bytes per row, `offset  hex…  ascii`.
  const dumpLen = Math.min(hexDumpBytes, bytes.length);
  const rows: string[] = [];
  for (let off = 0; off < dumpLen; off += 16) {
    const row = bytes.subarray(off, Math.min(off + 16, dumpLen));
    const hex = Array.from(row, hexOf)
      .join(" ")
      .padEnd(16 * 3 - 1, " ");
    const ascii = Array.from(row, (b) =>
      isPrintable(b) ? String.fromCharCode(b) : ".",
    ).join("");
    rows.push(`${off.toString(16).padStart(8, "0")}  ${hex}  ${ascii}`);
  }

  // Extract distinct printable runs of length ≥ 4.
  const strings: string[] = [];
  const seen = new Set<string>();
  let run = "";
  const flush = (): void => {
    if (run.length >= 4 && !seen.has(run)) {
      seen.add(run);
      strings.push(run);
    }
    run = "";
  };
  for (const b of bytes) {
    if (isPrintable(b)) run += String.fromCharCode(b);
    else flush();
    if (strings.length >= maxStrings) break;
  }
  flush();

  return {
    byteLength: totalSize,
    sampledBytes: bytes.length,
    printableRatio: bytes.length
      ? Math.round((printable / bytes.length) * 1000) / 1000
      : 0,
    magicAscii,
    magicHex,
    hexDump: rows.join("\n"),
    hexDumpBytes: dumpLen,
    strings: strings.slice(0, maxStrings),
  };
}
