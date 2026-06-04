import crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import StreamZip from "node-stream-zip";

export const mkdir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Compute an MD5 checksum over all file entries in a ZIP archive.
 * @param onProgress Optional callback: (entriesProcessed, totalEntries)
 */
export async function sdeZipChecksum(
  filePath: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const zip = new StreamZip.async({ file: filePath });
  const entries = await zip.entries();
  const total = await zip.entriesCount;
  // MD5 is required here: EVE Online's official SDE checksum endpoint publishes
  // an MD5 digest, so we must use the same algorithm to verify downloads. This
  // is integrity-checking, not cryptographic security. NOSONAR
  const checksum = crypto.createHash("md5"); // NOSONAR

  let processed = 0;
  for (const entry of Object.values(entries)) {
    if (entry.isDirectory) continue;
    const content = await zip.entryData(entry.name);
    checksum.update(content);
    processed++;
    onProgress?.(processed, total);
  }

  await zip.close();
  return checksum.digest("hex");
}

/**
 * Compute an MD5 checksum by reading extracted files from disk in the same
 * order they appear in the ZIP — used to verify an already-extracted SDE.
 * @param onProgress Optional callback: (entriesProcessed, totalEntries)
 */
export async function sdeFolderChecksum(
  sdeZipPath: string,
  sdeRootPath: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const zip = new StreamZip.async({ file: sdeZipPath });
  const entries = await zip.entries();
  const total = await zip.entriesCount;
  const checksum = crypto.createHash("md5"); // NOSONAR — see sdeZipChecksum

  let processed = 0;
  for (const entry of Object.values(entries)) {
    if (entry.isDirectory) continue;
    const content = await fs.promises.readFile(
      path.resolve(sdeRootPath, entry.name),
    );
    checksum.update(content);
    processed++;
    onProgress?.(processed, total);
  }

  await zip.close();
  return checksum.digest("hex");
}

/**
 * Extract a ZIP archive to a target directory.
 * @param onProgress Optional callback: (entriesExtracted, totalEntries)
 */
export async function unzipSde(
  zipFilePath: string,
  targetPath: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new StreamZip.async({ file: zipFilePath });
  const entries = await zip.entries();
  const total = await zip.entriesCount;

  let extracted = 0;
  for (const entry of Object.values(entries)) {
    const dest = path.resolve(targetPath, entry.name);
    if (entry.isDirectory) {
      mkdir(dest);
      continue;
    }
    mkdir(path.dirname(dest));
    await zip.extract(entry.name, dest);
    extracted++;
    onProgress?.(extracted, total);
  }

  await zip.close();
}
