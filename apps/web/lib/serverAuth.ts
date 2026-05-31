import type { NextRequest } from "next/server";

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

/**
 * Open-redirect guard: only allow same-site relative paths. Rejects absolute
 * URLs and protocol-relative ("//evil.com") paths.
 */
export function sanitizeReturnTo(returnTo: string | null | undefined): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/";
}
