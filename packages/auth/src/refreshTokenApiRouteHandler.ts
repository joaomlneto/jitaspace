import { HttpStatusCode } from "axios";
import z from "zod";

import {
  getEveSsoAccessTokenPayload,
  refreshEveSsoToken,
  tokenRefreshDataSchema,
} from "@jitaspace/auth-utils";

// How much time before token expires we're willing to refresh it
import { env } from "../env"; // TODO: Support optionally requesting a subset of existing scopes
import { sealDataWithAuthSecret, unsealDataWithAuthSecret } from "../utils";

// How much time (in ms) before token expires we're willing to refresh it
// This is to prevent refreshing tokens that are too new
const REFRESH_TOKEN_BEFORE_EXP_TIME = 60 * 1000; // 1 minute

// How much time (in ms) an access token is considered "too old" to be refreshed
// This is to prevent issues with tokens that were created a long time ago
const ACCESS_TOKEN_TOO_OLD_TIME = 30 * 24 * 3600 * 1000; // 30 days

// TODO: Support optionally requesting a subset of existing scopes
// See https://docs.esi.evetech.net/docs/sso/refreshing_access_tokens.html

/**
 * Framework-agnostic handler that refreshes an EVE SSO access token.
 *
 * Takes and returns Web standard `Request`/`Response` so it can be wired up to
 * any runtime (Next.js Route Handler, server action, plain fetch server, a
 * future mobile backend, …) without depending on Next.js. The request body is
 * the sealed `tokenRefreshData` string produced by {@link sealDataWithAuthSecret}.
 */
export const refreshTokenApiRouteHandler = async (
  request: Request,
): Promise<Response> => {
  const body = await request.text();

  // Confirm body is an (encrypted) string
  z.string().parse(body);

  // Attempt to unseal its contents
  const decodedBody = await unsealDataWithAuthSecret({
    data: body,
    secret: env.NEXTAUTH_SECRET,
  });

  // Deserialize unsealed contents back into JSON
  const unsealedBody = tokenRefreshDataSchema.parse(decodedBody);
  const { accessTokenExpiration, refreshToken } = unsealedBody;

  // TODO: VALIDATE TOKEN!!!

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

  // check if null
  if (env.EVE_CLIENT_ID === undefined || env.EVE_CLIENT_SECRET === undefined) {
    return Response.json(
      { error: "EVE_CLIENT_ID or EVE_CLIENT_SECRET is undefined" },
      { status: HttpStatusCode.InternalServerError },
    );
  }

  // Attempt to refresh token
  const { access_token, refresh_token } = await refreshEveSsoToken({
    eveClientId: env.EVE_CLIENT_ID,
    eveClientSecret: env.EVE_CLIENT_SECRET,
    refreshToken,
  });

  // Decode access token payload
  const payload = getEveSsoAccessTokenPayload(access_token);

  if (!payload)
    return Response.json(
      { error: "Unable to decode payload of refreshed token." },
      { status: HttpStatusCode.InternalServerError },
    );

  const sealedRefreshData = await sealDataWithAuthSecret({
    data: {
      accessTokenExpiration: payload.exp,
      refreshToken: refresh_token,
    },
    secret: env.NEXTAUTH_SECRET,
  });

  return Response.json({
    accessToken: access_token,
    refreshTokenData: sealedRefreshData,
  });
};
