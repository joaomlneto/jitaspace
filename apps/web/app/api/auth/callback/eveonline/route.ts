import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  completeLoginFlow,
  getOAuthFlowCookieName,
  getOAuthResultCookieName,
  OAUTH_RESULT_MAX_AGE_SECONDS,
  sealLoginResult,
} from "@jitaspace/auth";

import { getRequestOrigin } from "~/lib/serverAuth";

/**
 * Handles the EVE Online SSO redirect: verifies `state`, exchanges the code for
 * tokens, then hands them to the client via a single-use cookie + a small
 * completion page.
 */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const secure = origin.startsWith("https://");
  const params = req.nextUrl.searchParams;

  const flowCookieName = getOAuthFlowCookieName(secure);
  const sealedFlow = req.cookies.get(flowCookieName)?.value;

  // Always invalidate the state/PKCE cookie — it is strictly single-use.
  const clearFlowCookie = (response: NextResponse) =>
    response.cookies.set(flowCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });

  // The provider reported an error first (e.g. the user denied consent).
  const providerError = params.get("error");
  if (providerError) {
    const response = NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(providerError)}`,
    );
    clearFlowCookie(response);
    return response;
  }

  try {
    const { accessToken, encryptedRefreshToken, returnTo } =
      await completeLoginFlow({
        code: params.get("code"),
        state: params.get("state"),
        sealedFlow,
      });

    const sealedResult = await sealLoginResult({
      accessToken,
      encryptedRefreshToken,
    });

    const response = NextResponse.redirect(
      `${origin}/login/complete?returnTo=${encodeURIComponent(returnTo)}`,
    );
    clearFlowCookie(response);
    response.cookies.set(getOAuthResultCookieName(secure), sealedResult, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: OAUTH_RESULT_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("EVE SSO callback failed", error);
    const response = NextResponse.redirect(
      `${origin}/?auth_error=login_failed`,
    );
    clearFlowCookie(response);
    return response;
  }
}
