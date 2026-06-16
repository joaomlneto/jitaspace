import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { sdeInputFiles, SdeRecord } from "@jitaspace/sde-utils";
import { ensureSdePresentAndExtracted, loadFile } from "@jitaspace/sde-utils";

/**
 * Download + extract the EVE Online SDE archive into a throwaway temp directory,
 * hand the extracted root to `fn`, then remove the directory.
 *
 * Note: this downloads and extracts the WHOLE archive (the SDE is distributed as
 * a single ZIP). One ingest job per file therefore re-downloads the archive per
 * job; acceptable for now, but a shared download is the obvious future
 * optimization.
 */
async function withExtractedSde<T>(fn: (sdeRoot: string) => T): Promise<T> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jitaspace-sde-"));
  try {
    await ensureSdePresentAndExtracted(workDir);
    return fn(path.join(workDir, "sde"));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Parse a single SDE file (applying its `sdeInputFiles` transformations, e.g.
 * injecting the id for `addId` files). Returns the records as a map keyed by id.
 */
export async function loadSdeFile(
  filename: keyof typeof sdeInputFiles,
): Promise<SdeRecord> {
  return withExtractedSde((sdeRoot) => loadFile(filename, sdeRoot));
}

/**
 * Parse several SDE files from a single download + extraction, keyed by filename.
 * Use when a job needs cross-file data (e.g. celestial names resolved from the
 * universe hierarchy) without re-downloading the archive per file.
 */
export async function loadSdeFiles<F extends keyof typeof sdeInputFiles>(
  filenames: readonly F[],
): Promise<Record<F, SdeRecord>> {
  return withExtractedSde((sdeRoot) => {
    const result = {} as Record<F, SdeRecord>;
    for (const filename of filenames) {
      result[filename] = loadFile(filename, sdeRoot);
    }
    return result;
  });
}
