import { HttpStatusCode } from "axios";
import z from "zod";

import {
  refreshEveSsoToken,
  tokenRefreshDataSchema,
  verifyEveSsoAccessToken,
} from "@jitaspace/auth-utils";

import { sealDataWithAuthSecret, unsealDataWithAuthSecret } from "../utils";

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

  // Attempt to refresh token
  const { access_token, refresh_token } = await refreshEveSsoToken({
    eveClientId,
    eveClientSecret,
    refreshToken,
    scopes,
  });

  // Verify the refreshed token's signature against EVE's JWKS (and the
  // iss/aud/exp claims) before trusting its payload.
  const payload = await verifyEveSsoAccessToken(access_token).catch(() => null);

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
