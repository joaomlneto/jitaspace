import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createLoginFlow,
  getOAuthFlowCookieName,
  OAUTH_FLOW_MAX_AGE_SECONDS,
} from "@jitaspace/auth";

import { getRequestOrigin, sanitizeReturnTo } from "~/lib/serverAuth";

/**
 * Initiates the EVE Online SSO flow: generates `state` + PKCE, stores them in a
 * short-lived httpOnly cookie, and redirects the browser to the provider.
 */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const secure = origin.startsWith("https://");

  const scopes = (req.nextUrl.searchParams.get("scope") ?? "")
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const returnTo = sanitizeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const redirectUri = `${origin}/api/auth/callback/eveonline`;

  const { authorizationUrl, sealedFlow } = await createLoginFlow({
    scopes,
    redirectUri,
    returnTo,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(getOAuthFlowCookieName(secure), sealedFlow, {
    httpOnly: true,
    // `lax` (not `strict`): the provider redirects back via a top-level GET
    // navigation, on which `strict` cookies would not be sent.
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: OAUTH_FLOW_MAX_AGE_SECONDS,
  });
  return response;
}
