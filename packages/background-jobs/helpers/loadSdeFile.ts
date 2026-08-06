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
 *
 * Deliberately NOT memoized. Caching parsed records was tried and reverted: it
 * lifted the retained floor across the pipeline from ~0 MB to ~1.5 GB and raised
 * peak from ~1.8 GB to ~2.3 GB, because every cross-job reader of a big file
 * wants a projection, not the records — 7 of the 8 jobs that load types.yaml
 * (148 MB) need only its ids, and mapMoons.yaml (213 MB) is retained solely so
 * `moonNames` can derive a name map. Parsing one file at a time lets V8 collect
 * each before the next, which is what keeps `ingest-sde-all` inside its 4 GB
 * machine. Use {@link loadSdeFileIds} / {@link loadSdeFileKeys} for guard sets —
 * those cache the small projection instead.
 */
export async function loadSdeFile(
  filename: keyof typeof sdeInputFiles,
): Promise<SdeRecord> {
  return loadFile(filename, await getExtractedSdeRoot());
}

/**
 * Cached key projections. These hold a Set of ids per file — kilobytes — and drop
 * the parsed records, so a second job needing only a guard set never keeps the
 * source file resident.
 */
const idSets = new Map<string, Set<number>>();
const keySets = new Map<string, Set<string>>();

/**
 * The numeric ids present in an SDE file, for FK guards.
 *
 * Parses the file, takes its keys, and lets the records go. Memoized per process,
 * so the ~7 jobs that guard against types.yaml pay one parse between them instead
 * of one each — and none of them retains the 148 MB of records.
 */
export async function loadSdeFileIds(
  filename: keyof typeof sdeInputFiles,
): Promise<ReadonlySet<number>> {
  const cached = idSets.get(filename);
  if (cached) return cached;
  const ids = new Set(Object.keys(await loadSdeFile(filename)).map(Number));
  idSets.set(filename, ids);
  return ids;
}

/**
 * The raw (string) keys of an SDE file, for the UUID-keyed files whose ids are
 * not numeric. Same caching contract as {@link loadSdeFileIds}.
 */
export async function loadSdeFileKeys(
  filename: keyof typeof sdeInputFiles,
): Promise<ReadonlySet<string>> {
  const cached = keySets.get(filename);
  if (cached) return cached;
  const keys = new Set(Object.keys(await loadSdeFile(filename)));
  keySets.set(filename, keys);
  return keys;
}

/**
 * Parse several SDE files from a single download + extraction, keyed by filename.
 * Use when a job needs cross-file *records* (e.g. celestial names resolved from
 * the universe hierarchy). For a file you only need ids from, prefer
 * {@link loadSdeFileIds} — it does not keep the records alive.
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
