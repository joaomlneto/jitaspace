import type { H3Event } from "h3";
import { createError, setResponseHeader } from "h3";

import { parseSize, resizeToPng } from "./size";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  dds: "image/vnd-ms.dds",
};

/** Best-effort MIME type for a resource path, from its file extension. */
export function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/**
 * `Cache-Control` for served images. CDN objects are content-addressed (the
 * hashed path never changes its bytes), but the *logical* `res:/` → hash
 * mapping can change when CCP ships a new build — so we cache for a day at the
 * edge with a week of stale-while-revalidate, rather than `immutable`. A week
 * of stale-if-error keeps serving cached images through an upstream/DB outage.
 * Also used for the `/types/{id}` variations JSON.
 */
export const IMAGE_CACHE_CONTROL =
  process.env.IMAGE_CACHE_CONTROL ??
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800";

/**
 * `Cache-Control` for "doesn't exist" errors (404, and 400 for malformed IDs):
 * an unknown icon/type stays unknown until CCP ships a new build, so cache the
 * miss for hours (1h browser, 6h edge) instead of re-hitting the database for
 * every request. Server-side failures (5xx) are never cached — see `error.ts`.
 */
export const NOT_FOUND_CACHE_CONTROL =
  process.env.NOT_FOUND_CACHE_CONTROL ??
  "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400";

/**
 * Fetch an image's bytes from an upstream URL, returning the body alongside the
 * upstream `Content-Type`. Maps "doesn't exist" upstream statuses to a 404 and
 * anything else to a 502:
 *
 *   404 (unknown id) and 400 (e.g. a type that has no `render`) both mean "this
 *   image doesn't exist" → 404. Anything else (429, 5xx, …) is an upstream
 *   problem → 502.
 */
export async function fetchImage(
  url: string,
  label?: string,
): Promise<{ body: Buffer; contentType: string | null }> {
  const upstream = await fetch(url);
  if (!upstream.ok) {
    const notFound = upstream.status === 404 || upstream.status === 400;
    throw createError({
      statusCode: notFound ? 404 : 502,
      statusMessage: notFound
        ? `No image found for ${label ?? url}`
        : `Upstream responded ${upstream.status} for ${label ?? url}`,
    });
  }
  return {
    body: Buffer.from(await upstream.arrayBuffer()),
    contentType: upstream.headers.get("content-type"),
  };
}

/** Set our standard image response headers: content type/length, cache, CORS. */
export function setImageHeaders(
  event: H3Event,
  byteLength: number,
  contentType: string,
): void {
  setResponseHeader(event, "Content-Type", contentType);
  setResponseHeader(event, "Content-Length", byteLength);
  setResponseHeader(event, "Cache-Control", IMAGE_CACHE_CONTROL);
  setResponseHeader(event, "Access-Control-Allow-Origin", "*");
}

/**
 * Fetch an image from an upstream URL and return its bytes with our CORS and
 * cache headers.
 *
 * Pass `contentType` to override the upstream `Content-Type` — needed for CCP's
 * resource CDN, which labels every object `binary/octet-stream`. When
 * omitted (e.g. the image server, which is honest about PNG vs JPEG), the
 * upstream `Content-Type` is forwarded as-is.
 */
export async function proxyImage(
  event: H3Event,
  url: string,
  opts: { contentType?: string; label?: string } = {},
): Promise<Buffer> {
  const { body, contentType } = await fetchImage(url, opts.label);
  setImageHeaders(
    event,
    body.byteLength,
    opts.contentType ?? contentType ?? "application/octet-stream",
  );
  return body;
}

/**
 * Serve a resource from CCP's resfile CDN. The CDN labels every object
 * `binary/octet-stream` (and gzips it in transit, which `fetch` undoes), so the
 * real type is derived from the file extension.
 *
 * A valid `?size=` resizes the image (to a `size`×`size` PNG); without it the
 * native bytes are served unchanged.
 */
export async function serveFromCdn(
  event: H3Event,
  cdnUrl: string,
  logicalPath: string,
): Promise<Buffer> {
  const { body } = await fetchImage(cdnUrl, logicalPath);

  const size = parseSize(event);
  if (size === null) {
    setImageHeaders(event, body.byteLength, contentTypeFor(logicalPath));
    return body;
  }

  const resized = await resizeToPng(body, size);
  setImageHeaders(event, resized.byteLength, "image/png");
  return resized;
}
