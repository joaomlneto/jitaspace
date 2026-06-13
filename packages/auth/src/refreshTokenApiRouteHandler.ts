import { type NextApiRequest, type NextApiResponse } from "next";
import { HttpStatusCode } from "axios";
import z from "zod";

import {
  getEveSsoAccessTokenPayload,
  refreshEveSsoToken,
  tokenRefreshDataSchema,
} from "@jitaspace/auth-utils";

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
 * Credentials (`nextAuthSecret`, `eveClientId`, `eveClientSecret`) are supplied
 * by the caller — this package reads no environment variables of its own.
 */
export const refreshTokenApiRouteHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        accessToken: string;
        refreshTokenData: string;
      }
  >,
  config: {
    nextAuthSecret: string;
    eveClientId: string;
    eveClientSecret: string;
  },
) => {
  const { nextAuthSecret, eveClientId, eveClientSecret } = config;
  const body = req.body;

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

  // TODO: VALIDATE TOKEN!!!

  // Check if the access token is expired or is about to
  if (
    Date.now() <
    accessTokenExpiration * 1000 - REFRESH_TOKEN_BEFORE_EXP_TIME
  ) {
    return res
      .status(HttpStatusCode.TooEarly)
      .json({ error: "Token is not expired nor is about to expire." });
  }

  // Check if access token is too old to be refreshed
  if (Date.now() > accessTokenExpiration * 1000 + ACCESS_TOKEN_TOO_OLD_TIME) {
    return res
      .status(HttpStatusCode.Gone)
      .json({ error: "Access token is too old. Must reauthenticate." });
  }

  // Attempt to refresh token
  const { access_token, refresh_token } = await refreshEveSsoToken({
    eveClientId,
    eveClientSecret,
    refreshToken,
  });

  // Decode access token payload
  const payload = getEveSsoAccessTokenPayload(access_token);

  if (!payload)
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Unable to decode payload of refreshed token." });

  const sealedRefreshData = await sealDataWithAuthSecret({
    data: {
      accessTokenExpiration: payload.exp,
      refreshToken: refresh_token,
    },
    secret: nextAuthSecret,
  });

  return res.json({
    accessToken: access_token,
    refreshTokenData: sealedRefreshData,
  });
};
