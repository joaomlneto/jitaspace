import type { NextRequest } from "next/server";

// Re-exported so existing importers (e.g. the login route) keep a single
// import site; the guard itself lives in a server-free module so it can be
// shared with client components.
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
