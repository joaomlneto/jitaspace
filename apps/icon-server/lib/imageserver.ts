import type { H3Event } from "h3";

import { proxyImage } from "./serve";
import { parseSize } from "./size";

/**
 * Base URL of CCP's official image server. Used only for type-image variations
 * that aren't stored in the resfile — the `bp` / `bpc` blueprint images are a
 * runtime composite (blueprint frame + product render) that CCP builds on the
 * fly — so we proxy them verbatim for exact parity.
 */
const IMAGE_SERVER_BASE =
  process.env.IMAGE_SERVER_BASE ?? "https://images.evetech.net";

/** A valid `?size=` to forward to the image server, as a query string. */
function sizeQuery(event: H3Event): string {
  const size = parseSize(event);
  return size === null ? "" : `?size=${size}`;
}

/**
 * Proxy a type-image variation (`bp`, `bpc`, …) from CCP's image server with our
 * CORS + cache headers. The upstream `Content-Type` is forwarded as-is (the
 * image server is honest about PNG vs JPEG). A 400/404 upstream — e.g. a
 * non-blueprint asked for `/bp` — surfaces as a 404.
 */
export async function proxyTypeVariation(
  event: H3Event,
  typeId: number,
  variation: string,
): Promise<Buffer> {
  const url = `${IMAGE_SERVER_BASE}/types/${typeId}/${variation}${sizeQuery(event)}`;
  return proxyImage(event, url, { label: `type ${typeId} ${variation}` });
}
