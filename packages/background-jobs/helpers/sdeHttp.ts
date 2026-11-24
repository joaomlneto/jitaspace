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

/**
 * GET a file from the latest release. Resolves to null on a 404; retries
 * network errors, 429s and 5xx; throws on anything else, or once the retries
 * run out, so a run fails loudly rather than storing nothing.
 */
async function getSde(path: string): Promise<Response | null> {
  for (let attempt = 1; ; attempt++) {
    let failure: string;
    try {
      const res = await fetch(`${SDE_HTTP_ROOT}/${path}`, {
        headers: { "User-Agent": JITASPACE_USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return null;
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`SDE ${path}: HTTP ${res.status}`);
      }
      failure = `HTTP ${res.status}`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("SDE ")) {
        throw error;
      }
      failure = error instanceof Error ? error.message : "error";
    }
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(`SDE ${path}: ${failure} after ${attempt} attempts`);
    }
    await sleep(1000 * 2 ** attempt);
  }
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
