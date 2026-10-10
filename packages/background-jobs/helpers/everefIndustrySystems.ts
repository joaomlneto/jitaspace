/**
 * Reads EVE Ref's archive of GET /industry/systems responses
 * (https://data.everef.net/industry-systems/). EVE Ref fetches the endpoint
 * every hour and keeps each response as
 * `history/<year>/<date>/industry-systems-<date>_<hh-mm-ss>.json.bz2`, from
 * 2022-12-16 on; parts of 2017–2022 are in yearly `.tar.bz2` archives instead
 * (read by the bootstrap script, not here).
 *
 * EVE Ref allows full downloads, but sits behind a Cloudflare rate limit that
 * answers bursts with 429 (error 1015). Requests here go one at a time, at
 * least `MIN_REQUEST_INTERVAL_MS` apart, and back off on a 429 for as long as
 * its `Retry-After` asks.
 */
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import bz2 from "unbzip2-stream";

import type { IndustrySystemsResponse } from "./industryCostIndices.ts";
import {
  asIndustrySystemsResponse,
  parseEveRefSnapshotTime,
} from "./industryCostIndices.ts";

export const EVEREF_BASE_URL = "https://data.everef.net";

/** EVE Ref asks to be told who is downloading. */
export const EVEREF_USER_AGENT =
  "JitaSpace (https://www.jita.space; joao@jita.space)";

/** The day the hourly archive begins. */
export const EVEREF_DAILY_ARCHIVE_START = new Date("2022-12-16T00:00:00Z");

const MIN_REQUEST_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 8;
/** When a 429 carries no usable `Retry-After`. */
const DEFAULT_RETRY_AFTER_S = 15;

let nextRequestAt = 0;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Waits out the gap between requests and claims the next slot. */
async function takeRequestSlot() {
  const now = Date.now();
  const at = Math.max(now, nextRequestAt);
  nextRequestAt = at + MIN_REQUEST_INTERVAL_MS;
  if (at > now) await delay(at - now);
}

const retryAfterMs = (response: Response) => {
  const header = Number(response.headers.get("retry-after"));
  return (
    (Number.isFinite(header) && header > 0 ? header : DEFAULT_RETRY_AFTER_S) *
    1_000
  );
};

export class EveRefNotFoundError extends Error {}

/**
 * GETs a data.everef.net path, retrying rate limits and server errors. A 404
 * throws `EveRefNotFoundError` (a day EVE Ref has no directory for).
 */
export async function fetchEveRef(path: string): Promise<Response> {
  const url = new URL(path, EVEREF_BASE_URL).toString();
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await takeRequestSlot();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": EVEREF_USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      await delay(attempt * 5_000);
      continue;
    }
    if (response.ok) return response;
    await response.body?.cancel();
    if (response.status === 404) {
      throw new EveRefNotFoundError(`${url}: 404 Not Found`);
    }
    lastError = new Error(`${url}: ${response.status} ${response.statusText}`);
    if (response.status === 429) {
      const wait = retryAfterMs(response);
      // Hold every other request back too: the limit is per client.
      nextRequestAt = Math.max(nextRequestAt, Date.now() + wait);
      continue;
    }
    if (response.status < 500) break;
    await delay(attempt * 5_000);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Streams a response body through bunzip2 into a string. */
export async function bunzip2Text(response: Response): Promise<string> {
  if (response.body === null) throw new Error("Empty response body");
  const source = Readable.fromWeb(
    response.body as NodeWebReadableStream<Uint8Array>,
  );
  const decompress = bz2();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    source.on("error", reject);
    decompress.on("error", reject);
    decompress.on("data", (chunk: Buffer) => chunks.push(chunk));
    decompress.on("end", resolve);
    source.pipe(decompress);
  });
  return Buffer.concat(chunks).toString("utf8");
}

export interface EveRefSnapshotFile {
  /** Path under data.everef.net, e.g. `/industry-systems/history/2026/…`. */
  path: string;
  /** When EVE Ref fetched it, from the file name. */
  time: Date;
}

interface EveRefIndex {
  files?: { name: string; url: string }[];
}

const isoDate = (time: Date) => time.toISOString().slice(0, 10);

/**
 * The snapshots in EVE Ref's directory for one UTC day, oldest first. A day
 * EVE Ref has no directory for (there are gaps in 2023) has none.
 */
export async function listEveRefSnapshotsForDay(
  day: Date,
): Promise<EveRefSnapshotFile[]> {
  const date = isoDate(day);
  let response: Response;
  try {
    response = await fetchEveRef(
      `/industry-systems/history/${date.slice(0, 4)}/${date}/index.json`,
    );
  } catch (error) {
    if (error instanceof EveRefNotFoundError) return [];
    throw error;
  }
  const index = (await response.json()) as EveRefIndex;
  return (index.files ?? [])
    .flatMap((file) => {
      const time = parseEveRefSnapshotTime(file.name);
      return time === null ? [] : [{ path: new URL(file.url).pathname, time }];
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * The snapshots EVE Ref took after `after` and up to `until`, oldest first,
 * stopping once `limit` are found. Reads one directory index per day.
 */
export async function listEveRefSnapshotsBetween({
  after,
  until,
  limit,
}: {
  after: Date;
  until: Date;
  limit: number;
}): Promise<EveRefSnapshotFile[]> {
  const found: EveRefSnapshotFile[] = [];
  const day = new Date(
    Math.max(after.getTime(), EVEREF_DAILY_ARCHIVE_START.getTime()),
  );
  day.setUTCHours(0, 0, 0, 0);
  for (
    ;
    day <= until && found.length < limit;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    for (const file of await listEveRefSnapshotsForDay(day)) {
      if (file.time > after && file.time <= until && found.length < limit) {
        found.push(file);
      }
    }
  }
  return found;
}

/**
 * Downloads and parses one archived response; null if what EVE Ref saved is
 * not one (an error page, or truncated JSON).
 */
export async function fetchEveRefSnapshot(
  path: string,
): Promise<IndustrySystemsResponse | null> {
  return parseArchivedResponse(await fetchEveRefBz2Text(path));
}

/** Whole downloads retried when the connection drops mid-body. */
const BODY_ATTEMPTS = 3;

/**
 * Downloads a `.bz2` file and decompresses it. `fetchEveRef` retries the
 * request; this also retries a body cut off mid-download (EVE Ref's
 * Cloudflare closes the odd connection: "other side closed").
 */
export async function fetchEveRefBz2Text(path: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await bunzip2Text(await fetchEveRef(path));
    } catch (error) {
      if (error instanceof EveRefNotFoundError || attempt >= BODY_ATTEMPTS) {
        throw error;
      }
      await delay(attempt * 5_000);
    }
  }
}

/** An archived response's text, parsed; null if it is not a response. */
export function parseArchivedResponse(
  text: string,
): IndustrySystemsResponse | null {
  try {
    return asIndustrySystemsResponse(JSON.parse(text));
  } catch {
    return null;
  }
}
