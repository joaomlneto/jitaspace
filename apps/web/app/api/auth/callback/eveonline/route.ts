import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import {
  completeLoginFlow,
  getOAuthFlowCookieName,
  getOAuthResultCookieName,
  OAUTH_RESULT_MAX_AGE_SECONDS,
  sealLoginResult,
} from "@jitaspace/auth";

import { env } from "~/env";
import { extractCharacterIdFromAccessToken } from "~/lib/eveSsoToken";
import { getPostHogClient } from "~/lib/posthog-server";
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
        eveClientId: env.EVE_CLIENT_ID,
        eveClientSecret: env.EVE_CLIENT_SECRET,
        nextAuthSecret: env.NEXTAUTH_SECRET,
      });

    const sealedResult = await sealLoginResult(
      { accessToken, encryptedRefreshToken },
      { nextAuthSecret: env.NEXTAUTH_SECRET },
    );

    const characterId = extractCharacterIdFromAccessToken(accessToken);
    const posthog = characterId ? getPostHogClient() : null;
    if (posthog) {
      posthog.capture({
        distinctId: String(characterId),
        event: "login_initiated",
        properties: { character_id: characterId },
      });
      // Flush after the redirect is sent so analytics never blocks the login
      // hot path. On Vercel `after` runs via the platform's waitUntil lifecycle.
      after(async () => {
        await posthog.shutdown();
      });
    }

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
