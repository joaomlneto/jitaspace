import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { sdeInputFiles, SdeRecord } from "@jitaspace/sde-utils";
import { ensureSdePresentAndExtracted, loadFile } from "@jitaspace/sde-utils";

/**
 * Lazily download + extract the EVE Online SDE archive ONCE per process and
 * cache the extracted root. The first `loadSdeFile`/`loadSdeFiles` call fetches
 * the ~97MB ZIP into a temp directory; every later call in the same process
 * reuses it.
 *
 * The temp directory is intentionally not cleaned up — it lives for the process
 * lifetime so a single run that ingests many files (notably the `ingest-sde-all`
 * pipeline, which runs every ingest in one process) downloads the SDE just once.
 * Trigger.dev task processes are ephemeral, so the OS reclaims it when the run
 * ends. A failed download clears the cache so a later call can retry.
 *
 * Each `ingest-sde-*` job run is its own process, so running them individually
 * (or fanned out via `ctx.invoke`) still downloads the archive once per job.
 */
let extractedSdeRoot: Promise<string> | null = null;

function getExtractedSdeRoot(): Promise<string> {
  extractedSdeRoot ??= (async () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jitaspace-sde-"));
    await ensureSdePresentAndExtracted(workDir);
    return path.join(workDir, "sde");
  })().catch((error: unknown) => {
    extractedSdeRoot = null;
    throw error;
  });
  return extractedSdeRoot;
}

/**
 * Parse a single SDE file (applying its `sdeInputFiles` transformations, e.g.
 * injecting the id for `addId` files). Returns the records as a map keyed by id.
 */
export async function loadSdeFile(
  filename: keyof typeof sdeInputFiles,
): Promise<SdeRecord> {
  return loadFile(filename, await getExtractedSdeRoot());
}

/**
 * Parse several SDE files from a single download + extraction, keyed by filename.
 * Use when a job needs cross-file data (e.g. celestial names resolved from the
 * universe hierarchy).
 */
export async function loadSdeFiles<F extends keyof typeof sdeInputFiles>(
  filenames: readonly F[],
): Promise<Record<F, SdeRecord>> {
  const sdeRoot = await getExtractedSdeRoot();
  const result = {} as Record<F, SdeRecord>;
  for (const filename of filenames) {
    result[filename] = loadFile(filename, sdeRoot);
  }
  return result;
}
