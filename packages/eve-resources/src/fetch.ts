import type { EveServer } from "./constants";
import type { ResourceEntry } from "./types";
import { gunzipIfNeeded } from "./gzip";
import { binariesUrl, resourceUrl } from "./url";

/**
 * CDN URL for an entry's bytes. `app:/` files (game binaries, the index files)
 * live on the operating provider's binaries host; everything else
 * (`res:/`) on its resources host. `server` defaults to Tranquility (CCP).
 */
export function entryUrl(
  entry: ResourceEntry,
  server: EveServer = "tranquility",
): string {
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
  fetchImpl: typeof fetch = fetch,
  server: EveServer = "tranquility",
): Promise<Uint8Array> {
  const url = entryUrl(entry, server);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch resource ${entry.path} from ${url} (HTTP ${response.status})`,
    );
  }
  return gunzipIfNeeded(new Uint8Array(await response.arrayBuffer()));
}

/**
 * Fetch only the first `maxBytes` of a resource, streaming the response and
 * aborting the rest — for huge files where only
 * the header is needed. The CDN ignores Range requests, so this caps the
 * transfer client-side instead. Not gunzipped (`res:/` files are uncompressed).
 */
export async function fetchResourceHead(
  entry: ResourceEntry,
  maxBytes: number,
  fetchImpl: typeof fetch = fetch,
  server: EveServer = "tranquility",
): Promise<Uint8Array> {
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
    return all.subarray(0, maxBytes);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    controller.abort(); // stop the rest of the (potentially huge) transfer
  }

  const out = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  // Reading stopped at the chunk that crossed maxBytes, so only that last chunk
  // can need truncating.
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, out.length - offset);
    out.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return out;
}
