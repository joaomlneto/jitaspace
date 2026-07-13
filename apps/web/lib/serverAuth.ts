import type { NextRequest } from "next/server";

// Re-exported from a client-safe module so this server helper and the client
// login/complete page share one open-redirect guard implementation.
export { sanitizeReturnTo } from "./returnTo";

/**
 * Resolve the externally-visible origin of the request, honouring the
 * reverse-proxy headers Vercel sets. Used to build the OAuth `redirect_uri`
 * and same-origin redirects.
 */
export function getRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto =
    forwardedProto?.split(",")[0]?.trim() ??
    req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
