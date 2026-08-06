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
 * Parsed files, memoized per process.
 *
 * `getExtractedSdeRoot` caches the *extraction*, not the parse, so without this
 * every `loadSdeFile`/`loadSdeFiles` call re-parsed the YAML from disk. That is
 * expensive for the large files and several jobs legitimately need the same file:
 * `ingest-sde-epic-arcs` reads the 54 MB missions.yaml purely to build a Set of
 * ids that `ingest-sde-missions` has already parsed, and the ship-tree and SKINR
 * jobs each re-read their guard files.
 *
 * Held for the process lifetime, like the extraction: the `ingest-sde-all`
 * pipeline runs every job in one process, and Trigger.dev task processes are
 * ephemeral. Peak memory is unchanged in the worst case (the largest file was
 * already resident during its own job) and strictly lower across the pipeline,
 * since re-parsing built a second copy before the first was collected.
 */
const parsedFiles = new Map<string, SdeRecord>();

/**
 * Parse a single SDE file (applying its `sdeInputFiles` transformations, e.g.
 * injecting the id for `addId` files). Returns the records as a map keyed by id.
 *
 * The result is memoized per process and shared between callers, so treat it as
 * read-only — mutating it would corrupt every later reader.
 */
export async function loadSdeFile(
  filename: keyof typeof sdeInputFiles,
): Promise<SdeRecord> {
  const cached = parsedFiles.get(filename);
  if (cached) return cached;
  const parsed = loadFile(filename, await getExtractedSdeRoot());
  parsedFiles.set(filename, parsed);
  return parsed;
}

/**
 * Parse several SDE files from a single download + extraction, keyed by filename.
 * Use when a job needs cross-file data (e.g. celestial names resolved from the
 * universe hierarchy).
 *
 * Shares {@link loadSdeFile}'s per-process parse cache, so the returned records
 * are read-only.
 */
export async function loadSdeFiles<F extends keyof typeof sdeInputFiles>(
  filenames: readonly F[],
): Promise<Record<F, SdeRecord>> {
  const result = {} as Record<F, SdeRecord>;
  for (const filename of filenames) {
    result[filename] = await loadSdeFile(filename);
  }
  return result;
}
