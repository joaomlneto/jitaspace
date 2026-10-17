/**
 * Reads EVE Ref's archive of GET /sovereignty/map
 * (https://data.everef.net/sovereignty-map/history/): yearly tarballs for
 * 2017-11 to 2022-12, then one bzip2'd JSON file per hour in a directory per
 * day. Requests go one at a time: EVE Ref answers bursts with 429s.
 */
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import tar from "tar-stream";
import bz2 from "unbzip2-stream";

import type {
  SovereigntyMapEntry,
  SovereigntyObservation,
} from "./sovereigntyHistory.ts";
import { EVEREF_USER_AGENT } from "../utils/downloadFile.ts";
import {
  isKSpaceSolarSystemId,
  observationFromMap,
} from "./sovereigntyHistory.ts";

const HISTORY_URL = "https://data.everef.net/sovereignty-map/history";

/** How long to keep trying one request, and how long each attempt may take. */
export interface EveRefRequestPolicy {
  attempts: number;
  /** For the whole attempt: the request and reading its body. */
  timeoutMs: number;
}

/**
 * For the import, which has hours: wait out whatever EVE Ref throws at it
 * rather than fail a run.
 */
export const PATIENT_EVEREF_REQUESTS: EveRefRequestPolicy = {
  attempts: 6,
  timeoutMs: 120_000,
};

/**
 * For the 5-minute poll: give up fast, and leave the rest of the gap to the
 * next run rather than hold up the current holders' sync.
 */
export const QUICK_EVEREF_REQUESTS: EveRefRequestPolicy = {
  attempts: 2,
  timeoutMs: 30_000,
};

/**
 * Reading a yearly tarball means downloading up to 122 MB and decompressing it
 * in JavaScript: ~90 s on a fast laptop, so far longer on a 1-vCPU machine.
 */
const ARCHIVE_REQUESTS: EveRefRequestPolicy = {
  attempts: 6,
  timeoutMs: 30 * 60_000,
};

interface EveRefIndex {
  directories?: { name: string; index_url: string }[];
  files?: { name: string; url: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A response EVE Ref answered with an error status. */
class EveRefHttpError extends Error {
  constructor(
    url: string,
    readonly response: Response,
  ) {
    super(`EVE Ref ${url}: ${response.status} ${response.statusText}`);
  }

  /** A 429 or a 5xx: worth waiting out. A 404 is not. */
  get retryable() {
    return this.response.status === 429 || this.response.status >= 500;
  }
}

/**
 * GETs from EVE Ref and reads the response with `read`, retrying the whole of
 * it on a 429 or a 5xx (waiting as long as Retry-After says, else backing off)
 * and on a connection that drops before the body is read (EVE Ref's CDN
 * sometimes closes one mid-file). Fails on anything else, and once `policy`'s
 * attempts are spent: a file that cannot be read must never be mistaken for a
 * gap in the data.
 */
async function fetchEveRef<T>(
  url: string,
  policy: EveRefRequestPolicy,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      // One attempt at a time, by design: each retry waits on the last.
      const response = await fetch(url, {
        headers: { "User-Agent": EVEREF_USER_AGENT },
        signal: AbortSignal.timeout(policy.timeoutMs),
      }); // NOSONAR: retries are sequential
      if (!response.ok) throw new EveRefHttpError(url, response);
      return await read(response); // NOSONAR: retries are sequential
    } catch (error) {
      const http = error instanceof EveRefHttpError ? error : null;
      if ((http && !http.retryable) || attempt >= policy.attempts) throw error;
      await http?.response.body?.cancel(); // NOSONAR: retries are sequential
      await sleep(retryDelayMs(http, attempt)); // NOSONAR: retries are sequential
    }
  }
}

/** As long as EVE Ref's Retry-After says, else exponential backoff. */
const retryDelayMs = (http: EveRefHttpError | null, attempt: number) => {
  const retryAfter = Number(http?.response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : 2 ** attempt * 1000;
};

const fetchIndex = (url: string, policy: EveRefRequestPolicy) =>
  fetchEveRef(
    url,
    policy,
    async (response) => (await response.json()) as EveRefIndex,
  );

const toNodeStream = (response: Response) => {
  if (response.body === null) throw new Error(`EVE Ref: empty body`);
  // `response.body` is the DOM ReadableStream; at runtime it is the object
  // `Readable.fromWeb` expects.
  return Readable.fromWeb(response.body as NodeWebReadableStream<Uint8Array>);
};

/** "2017-12-27T02:00:02" or "2026-10-09_00-40-05" in a file name, as UTC. */
export const snapshotTimeFromName = (name: string): Date | null => {
  const match = /(\d{4}-\d\d-\d\d)[T_](\d\d)[:-](\d\d)[:-](\d\d)/.exec(name);
  if (!match) return null;
  const [, day, h, m, s] = match;
  return new Date(`${day}T${h}:${m}:${s}Z`);
};

export interface EveRefYearArchive {
  kind: "archive";
  year: number;
  url: string;
}

export interface EveRefDay {
  kind: "day";
  /** UTC midnight. */
  day: Date;
  indexUrl: string;
}

/**
 * The archive's parts, oldest first, skipping any wholly at or before
 * `after`. Lists day directories but not their files, so a short gap costs a
 * couple of requests.
 */
export async function listEveRefSovereigntyArchive(
  after: Date | null,
  policy = PATIENT_EVEREF_REQUESTS,
): Promise<(EveRefYearArchive | EveRefDay)[]> {
  const root = await fetchIndex(`${HISTORY_URL}/index.json`, policy);
  const afterYear = after?.getUTCFullYear() ?? 0;

  const archives: EveRefYearArchive[] = (root.files ?? [])
    .flatMap((file) => {
      const year = Number(
        /sovereignty-map-(\d{4})\.tar\.bz2$/.exec(file.name)?.[1],
      );
      return Number.isInteger(year)
        ? [{ kind: "archive" as const, year, url: file.url }]
        : [];
    })
    .filter((archive) => archive.year >= afterYear)
    .sort((a, b) => a.year - b.year);

  const days: EveRefDay[] = [];
  const years = (root.directories ?? [])
    .filter((dir) => Number(dir.name) >= afterYear)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const year of years) {
    const index = await fetchIndex(year.index_url, policy); // NOSONAR: one request at a time
    for (const dir of index.directories ?? []) {
      const day = new Date(`${dir.name}T00:00:00Z`);
      if (Number.isNaN(+day)) continue;
      // A day may still hold snapshots after `after` if it is that same day.
      if (after !== null && +day + 86_400_000 <= +after) continue;
      days.push({ kind: "day", day, indexUrl: dir.index_url });
    }
  }
  days.sort((a, b) => +a.day - +b.day);
  return [...archives, ...days];
}

/** The hourly files of one day directory, oldest first. */
export async function listEveRefDay(
  day: EveRefDay,
  policy = PATIENT_EVEREF_REQUESTS,
) {
  const index = await fetchIndex(day.indexUrl, policy);
  return (index.files ?? [])
    .flatMap((file) => {
      const observedAt = snapshotTimeFromName(file.name);
      return observedAt && file.name.endsWith(".json.bz2")
        ? [{ observedAt, url: file.url }]
        : [];
    })
    .sort((a, b) => +a.observedAt - +b.observedAt);
}

const decompressBz2 = (response: Response) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const source = toNodeStream(response);
    const decompress = bz2();
    source.on("error", reject);
    decompress.on("error", reject);
    decompress.on("data", (chunk: Buffer) => chunks.push(chunk));
    decompress.on("end", () => resolve(Buffer.concat(chunks)));
    source.pipe(decompress);
  });

/**
 * A /sovereignty/map response as EVE Ref archived it, or null when it archived
 * an error instead: ESI's (`{"error":"Timeout contacting tranquility"}`) or a
 * proxy's HTML page, both found in the 2018 archive.
 */
const parseMapResponse = (json: Buffer): SovereigntyMapEntry[] | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.toString("utf8"));
  } catch {
    return null;
  }
  return Array.isArray(parsed) ? (parsed as SovereigntyMapEntry[]) : null;
};

/** One hourly file, as an observation; null if it holds an ESI error. */
export async function fetchEveRefSnapshot(
  file: { observedAt: Date; url: string },
  policy = PATIENT_EVEREF_REQUESTS,
): Promise<SovereigntyObservation | null> {
  const json = await fetchEveRef(file.url, policy, decompressBz2);
  const entries = parseMapResponse(json);
  return entries && observationFromMap(entries, file.observedAt, "everef");
}

/** Reads a yearly tarball into compact snapshots; see readEveRefYearArchive. */
async function collectArchive(response: Response, after: Date | null) {
  const holders: SovereigntyMapEntry[] = [];
  const holderIds = new Map<string, number>();
  const systemIds: number[] = [];
  const systemIndex = new Map<number, number>();
  const snapshots: { observedAt: Date; holderBySystem: Uint16Array }[] = [];
  const NOT_LISTED = 0xffff;
  let errors = 0;

  const keep = (entries: SovereigntyMapEntry[], observedAt: Date) => {
    const kSpace = entries.filter((entry) =>
      isKSpaceSolarSystemId(entry.system_id),
    );
    for (const entry of kSpace) {
      if (!systemIndex.has(entry.system_id)) {
        systemIndex.set(entry.system_id, systemIds.length);
        systemIds.push(entry.system_id);
      }
    }
    const holderBySystem = new Uint16Array(systemIds.length).fill(NOT_LISTED);
    for (const entry of kSpace) {
      const key = `${entry.alliance_id}:${entry.corporation_id}:${entry.faction_id}`;
      let id = holderIds.get(key);
      if (id === undefined) {
        id = holders.length;
        if (id >= NOT_LISTED) throw new Error("Too many distinct holders");
        holderIds.set(key, id);
        holders.push({ ...entry, system_id: 0 });
      }
      const index = systemIndex.get(entry.system_id);
      if (index !== undefined) holderBySystem[index] = id;
    }
    snapshots.push({ observedAt, holderBySystem });
  };

  const source = toNodeStream(response);
  const decompress = bz2();
  const extract = tar.extract();
  await new Promise<void>((resolve, reject) => {
    source.on("error", reject);
    decompress.on("error", reject);
    extract.on("error", reject);
    extract.on("entry", (header, stream, next) => {
      const observedAt = snapshotTimeFromName(header.name);
      if (
        header.type !== "file" ||
        observedAt === null ||
        (after !== null && +observedAt <= +after)
      ) {
        stream.on("end", () => next());
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => {
        const entries = parseMapResponse(Buffer.concat(chunks));
        if (entries) keep(entries, observedAt);
        else errors++;
        next();
      });
    });
    extract.on("finish", resolve);
    source.pipe(decompress).pipe(extract);
  });

  return { holders, systemIds, snapshots, errors };
}

/**
 * A yearly tarball's snapshots after `after`, oldest first. Its entries are in
 * no particular order, so all of them are read before the first is returned;
 * each is kept compact (a small integer per system, indexing the distinct
 * holders) and only expanded as it is iterated, since the 2018 archive alone
 * holds ~7,900 snapshots of ~5,400 systems.
 */
export async function readEveRefYearArchive(
  archive: EveRefYearArchive,
  after: Date | null,
): Promise<{
  count: number;
  /** Entries holding an error rather than a map. */
  errors: number;
  observations: Iterable<SovereigntyObservation>;
}> {
  const { holders, systemIds, snapshots, errors } = await fetchEveRef(
    archive.url,
    ARCHIVE_REQUESTS,
    (response) => collectArchive(response, after),
  );
  snapshots.sort((a, b) => +a.observedAt - +b.observedAt);
  function* expand() {
    for (const { observedAt, holderBySystem } of snapshots) {
      const entries: SovereigntyMapEntry[] = [];
      holderBySystem.forEach((id, index) => {
        const holder = holders[id];
        const systemId = systemIds[index];
        if (holder && systemId !== undefined) {
          entries.push({ ...holder, system_id: systemId });
        }
      });
      yield observationFromMap(entries, observedAt, "everef");
    }
  }
  return { count: snapshots.length, errors, observations: expand() };
}
