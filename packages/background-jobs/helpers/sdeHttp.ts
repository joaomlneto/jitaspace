/**
 * CCP's SDE over HTTP (https://sde.evetech.net), for the few places that need a
 * static record before the next SDE ingest has run — chiefly
 * `createCorpAndItsRefRecords`, which must create the bloodline, race, faction
 * or NPC station a corporation or character points at. ESI stopped serving
 * these at compatibility date 2026-11-19 and points here instead.
 *
 * `latest/` redirects to the current release, whose files are immutable. The
 * records are the same data as the archive the ingest jobs read, in the same
 * camelCase shape (`typeID`, `name: { en: … }`), so the `sdeFields` helpers
 * apply to them unchanged.
 */
import { JITASPACE_USER_AGENT } from "./refResolution";

const SDE_HTTP_ROOT = "https://sde.evetech.net/tranquility/latest";

const MAX_ATTEMPTS = 6;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown for a response that retrying will not fix. */
class SdeHttpError extends Error {}

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

/**
 * One GET. Resolves to the response, or to null on a 404; throws SdeHttpError
 * for a status that retrying will not fix, and anything else for a failure
 * worth retrying.
 */
async function fetchOnce(path: string): Promise<Response | null> {
  const res = await fetch(`${SDE_HTTP_ROOT}/${path}`, {
    headers: { "User-Agent": JITASPACE_USER_AGENT },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 404) return null;
  if (res.ok) return res;
  if (!isRetryableStatus(res.status)) {
    throw new SdeHttpError(`SDE ${path}: HTTP ${res.status}`);
  }
  throw new Error(`HTTP ${res.status}`);
}

/**
 * GET a file from the latest release. Resolves to null on a 404; retries
 * network errors, 429s and 5xx with exponential backoff; throws on anything
 * else, or once the retries run out, so a run fails loudly rather than
 * storing nothing.
 */
async function getSde(path: string, attempt = 1): Promise<Response | null> {
  try {
    return await fetchOnce(path);
  } catch (error) {
    if (error instanceof SdeHttpError) throw error;
    const failure = error instanceof Error ? error.message : "error";
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(`SDE ${path}: ${failure} after ${attempt} attempts`);
    }
  }
  await sleep(1000 * 2 ** attempt);
  return getSde(path, attempt + 1);
}

/** One record by its key, e.g. `fetchSdeRecord("npcStations", 60003760)`. */
export async function fetchSdeRecord(
  table: string,
  key: number,
): Promise<Record<string, unknown> | null> {
  const res = await getSde(`${table}/${key}.json`);
  return res ? ((await res.json()) as Record<string, unknown>) : null;
}

/**
 * A whole table, keyed by its record key (the first field of each JSON Lines
 * record, e.g. `raceID`). Only for the small tables; the big ones are what the
 * ingest jobs are for.
 */
export async function fetchSdeTable(
  table: string,
): Promise<Map<number, Record<string, unknown>>> {
  const res = await getSde(`${table}.jsonl`);
  if (!res) throw new Error(`SDE table ${table} does not exist`);
  const records = new Map<number, Record<string, unknown>>();
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as Record<string, unknown>;
    const [key] = Object.values(record);
    records.set(Number(key), record);
  }
  return records;
}
