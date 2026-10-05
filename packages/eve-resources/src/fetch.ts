import type { EveServer } from "./constants";
import type { ResourceEntry } from "./types";
import { gunzipIfNeeded } from "./gzip";
import { binariesUrl, resourceUrl } from "./url";

/**
 * CDN URL for an entry's bytes. `app:/` files (game binaries, the index files)
 * live on the operating provider's binaries host; everything else
 * (`res:/`) on its resources host. `server` must be the server whose index the
 * entry came from: it has no default, because a file that exists only on the
 * NetEase clusters 404s on CCP's hosts.
 */
export function entryUrl(entry: ResourceEntry, server: EveServer): string {
  return entry.path.startsWith("app:/")
    ? binariesUrl(entry.relPath, server)
    : resourceUrl(entry.relPath, server);
}

/**
 * Fetch the raw bytes of a `res:/` or `app:/` resource file from the CDN.
 *
 * Network-bound; intended for server/CLI use (the CDN sends no CORS headers).
 */
export async function fetchResourceBytes(
  entry: ResourceEntry,
  server: EveServer,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const url = entryUrl(entry, server);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch resource ${entry.path} from ${url} (HTTP ${response.status})`,
    );
  }
  return gunzipIfNeeded(new Uint8Array(await response.arrayBuffer()), url);
}

/**
 * Fetch only the first `maxBytes` of a resource, streaming the response and
 * cancelling the rest — for huge files where only the header is needed. The
 * CDN ignores Range requests, so this caps the transfer client-side instead.
 * Returns the bytes as `fetch` delivers them (without
 * {@link fetchResourceBytes}'s gzip sniffing). A `maxBytes` of 0 or less (or
 * NaN) returns an empty array without making a request.
 */
export async function fetchResourceHead(
  entry: ResourceEntry,
  server: EveServer,
  maxBytes: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const limit = maxBytes > 0 ? Math.floor(maxBytes) : 0;
  if (limit === 0) return new Uint8Array(0);

  const url = entryUrl(entry, server);
  const controller = new AbortController();
  const response = await fetchImpl(url, { signal: controller.signal });
  if (!response.ok) {
    controller.abort();
    throw new Error(
      `Failed to fetch resource ${entry.path} from ${url} (HTTP ${response.status})`,
    );
  }
  if (!response.body) {
    const all = new Uint8Array(await response.arrayBuffer());
    return all.subarray(0, limit);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    // Stop the rest of the (potentially huge) transfer. Cancelling the reader
    // works even when `fetchImpl` ignores the abort signal. It takes effect
    // immediately, so don't wait for it to settle (a custom stream's cancel
    // might never), and a failed cancel doesn't matter once we have our bytes.
    void reader.cancel().catch(() => undefined);
    controller.abort();
  }

  const out = new Uint8Array(Math.min(total, limit));
  let offset = 0;
  // Reading stopped at the chunk that crossed the limit, so only that last
  // chunk can need truncating.
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, out.length - offset);
    out.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return out;
}
