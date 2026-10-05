import type { EveServer } from "@jitaspace/eve-resources";
import { fetchResourceIndex, resourceUrl } from "@jitaspace/eve-resources";

/** The cluster whose resources (and SDE) this service serves. */
const SERVER: EveServer = "tranquility";

/**
 * A resolved EVE resfile index: a case-insensitive lookup from a `res:/…`
 * virtual path to its content-addressed CDN relative path, tagged with the
 * build it came from.
 */
interface ResfileSnapshot {
  build: string;
  /** lowercase `res:/…` path → CDN relative path */
  index: Map<string, string>;
  fetchedAt: number;
}

/**
 * How long a fetched resfile index is considered fresh, in milliseconds. After
 * this, the next request triggers a background-free refetch (picking up new EVE
 * client builds). Defaults to 1 hour.
 */
const TTL_MS = Number(process.env.RESFILE_TTL_MS ?? 60 * 60 * 1000);

let snapshot: ResfileSnapshot | null = null;
/** Dedupe concurrent loads so a cold start fires only one upstream fetch. */
let inflight: Promise<ResfileSnapshot> | null = null;

async function load(): Promise<ResfileSnapshot> {
  const { build, entries } = await fetchResourceIndex(SERVER);
  const index = new Map<string, string>(
    entries.map((entry) => [entry.path.toLowerCase(), entry.relPath]),
  );
  return { build, index, fetchedAt: Date.now() };
}

/**
 * Return the current resfile snapshot, fetching (and caching) it on first use
 * and refreshing it once the TTL lapses. The index is ~120k entries (~5 MB);
 * within a warm process this is an in-memory map after the first call.
 */
export async function getResfile(): Promise<ResfileSnapshot> {
  if (snapshot && Date.now() - snapshot.fetchedAt < TTL_MS) return snapshot;
  inflight ??= load()
    .then((next) => {
      snapshot = next;
      inflight = null;
      return next;
    })
    .catch((error: unknown) => {
      inflight = null; // let the next request retry
      // Serve a stale snapshot rather than erroring if we have one.
      if (snapshot) return snapshot;
      throw error;
    });
  return inflight;
}

/**
 * Normalise arbitrary user input into a canonical `res:/…` path:
 *   "ui/texture/icons/7_64_15.png"      → "res:/ui/texture/icons/7_64_15.png"
 *   "/ui/texture/icons/7_64_15.png"     → "res:/ui/texture/icons/7_64_15.png"
 *   "res:/ui/texture/icons/7_64_15.png" → unchanged
 */
export function normalizeResPath(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, "");
  return /^res:\//i.test(trimmed) ? trimmed : `res:/${trimmed}`;
}

/**
 * Resolve a `res:/…` path to its absolute CDN URL on resources.eveonline.com,
 * or `null` if the path is absent from the current build's resfile index.
 */
export async function resolveResPath(input: string): Promise<string | null> {
  const { index } = await getResfile();
  const relPath = index.get(normalizeResPath(input).toLowerCase());
  return relPath != null ? resourceUrl(relPath, SERVER) : null;
}
