import { HttpStatusCode } from "axios";
import z from "zod";

import type { SsoRefreshTokenSuccessResult } from "@jitaspace/auth-utils";
import {
  EveSsoTokenError,
  refreshEveSsoToken,
  verifyEveSsoAccessToken,
} from "@jitaspace/auth-utils";

import { sealDataWithAuthSecret, unsealDataWithAuthSecret } from "../utils";

/**
 * The sealed payload this handler exchanges with its client.
 *
 * Not an EVE SSO concept: it is this application's own cookie shape, produced
 * by {@link sealDataWithAuthSecret} (camelCase, whereas EVE's token responses
 * are snake_case). It lives here rather than in the framework-agnostic
 * `@jitaspace/auth-utils` because nothing outside this handler produces or
 * consumes it.
 */
export const tokenRefreshDataSchema = z.object({
  accessTokenExpiration: z.number(),
  refreshToken: z.string(),
});

// How much time (in ms) before token expires we're willing to refresh it
// This is to prevent refreshing tokens that are too new
const REFRESH_TOKEN_BEFORE_EXP_TIME = 60 * 1000; // 1 minute

// How much time (in ms) an access token is considered "too old" to be refreshed
// This is to prevent issues with tokens that were created a long time ago
const ACCESS_TOKEN_TOO_OLD_TIME = 30 * 24 * 3600 * 1000; // 30 days

/**
 * Framework-agnostic handler that refreshes an EVE SSO access token.
 *
 * Takes and returns Web standard `Request`/`Response` so it can be wired up to
 * any runtime (Next.js Route Handler, server action, plain fetch server, a
 * future mobile backend, …) without depending on Next.js. The request body is
 * the sealed `tokenRefreshData` string produced by {@link sealDataWithAuthSecret}.
 *
 * Credentials (`nextAuthSecret`, `eveClientId`, `eveClientSecret`) are supplied
 * by the caller — this package reads no environment variables of its own. Pass
 * `scopes` to request a subset of the originally-granted scopes on the refresh
 * (least privilege); omit it to keep the full scope set.
 */
export const refreshTokenApiRouteHandler = async (
  request: Request,
  config: {
    nextAuthSecret: string;
    eveClientId: string;
    eveClientSecret: string;
    scopes?: string[];
  },
): Promise<Response> => {
  const { nextAuthSecret, eveClientId, eveClientSecret, scopes } = config;
  const body = await request.text();

  // Confirm body is an (encrypted) string
  z.string().parse(body);

  // Attempt to unseal its contents
  const decodedBody = await unsealDataWithAuthSecret({
    data: body,
    secret: nextAuthSecret,
  });

  // Deserialize unsealed contents back into JSON
  const unsealedBody = tokenRefreshDataSchema.parse(decodedBody);
  const { accessTokenExpiration, refreshToken } = unsealedBody;

  // Check if the access token is expired or is about to
  if (
    Date.now() <
    accessTokenExpiration * 1000 - REFRESH_TOKEN_BEFORE_EXP_TIME
  ) {
    return Response.json(
      { error: "Token is not expired nor is about to expire." },
      { status: HttpStatusCode.TooEarly },
    );
  }

  // Check if access token is too old to be refreshed
  if (Date.now() > accessTokenExpiration * 1000 + ACCESS_TOKEN_TOO_OLD_TIME) {
    return Response.json(
      { error: "Access token is too old. Must reauthenticate." },
      { status: HttpStatusCode.Gone },
    );
  }

  // Attempt to refresh token. An `invalid_grant` means EVE has permanently
  // rejected this refresh token (application revoked, password changed), so it
  // maps onto the same 410 the age check above uses — the caller must prompt a
  // re-authentication. Every other failure propagates as a thrown error so the
  // caller keeps treating it as transient and retries.
  let refreshed: SsoRefreshTokenSuccessResult;
  try {
    refreshed = await refreshEveSsoToken({
      eveClientId,
      eveClientSecret,
      refreshToken,
      scopes,
    });
  } catch (error) {
    if (error instanceof EveSsoTokenError && error.requiresReauthentication) {
      return Response.json(
        { error: "EVE rejected the refresh token. Must reauthenticate." },
        { status: HttpStatusCode.Gone },
      );
    }
    throw error;
  }
  const { access_token, refresh_token } = refreshed;

  // Verify the refreshed token's signature against EVE's JWKS (and the
  // iss/aud/exp claims) before trusting its payload. `clientId` binds it to
  // this application — without it any EVE app's token would verify.
  const payload = await verifyEveSsoAccessToken(access_token, {
    clientId: eveClientId,
  }).catch(() => null);

  if (!payload)
    return Response.json(
      { error: "Refreshed access token failed verification." },
      { status: HttpStatusCode.InternalServerError },
    );

  const sealedRefreshData = await sealDataWithAuthSecret({
    data: {
      accessTokenExpiration: payload.exp,
      refreshToken: refresh_token,
    },
    secret: nextAuthSecret,
  });

  return Response.json({
    accessToken: access_token,
    refreshTokenData: sealedRefreshData,
  });
};
