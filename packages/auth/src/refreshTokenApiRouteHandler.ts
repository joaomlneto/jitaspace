import { type NextApiRequest, type NextApiResponse } from "next";
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

export const refreshTokenApiRouteHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        accessToken: string;
        refreshTokenData: string;
      }
  >,
) => {
  const body = req.body;

  // Confirm body is an (encrypted) string
  z.string().parse(body);

  // Attempt to unseal its contents
  const decodedBody = await unsealDataWithAuthSecret(body);

  console.log({ decodedBody });

  // Deserialize unsealed contents back into JSON
  const unsealedBody = tokenRefreshDataSchema.parse(decodedBody);
  console.log({ unsealedBody });
  const { accessTokenExpiration, refreshToken } = unsealedBody;

  console.log({ accessTokenExpiration, refreshToken });

  // TODO: VALIDATE TOKEN!!!

  // Check if the access token is expired or is about to
  if (Date.now() < accessTokenExpiration - REFRESH_TOKEN_BEFORE_EXP_TIME) {
    return res
      .status(HttpStatusCode.TooEarly)
      .json({ error: "Token is not expired nor is about to expire." });
  }

  // Check if access token is too old to be refreshed
  if (Date.now() > accessTokenExpiration + ACCESS_TOKEN_TOO_OLD_TIME) {
    return res
      .status(HttpStatusCode.Gone)
      .json({ error: "Access token is too old. Must reauthenticate." });
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
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Unable to decode payload of refreshed token." });

  const sealedRefreshData = await sealDataWithAuthSecret({
    accessTokenExpiration: payload.exp,
    refreshToken: refresh_token,
  });

  return res.json({
    accessToken: access_token,
    refreshTokenData: sealedRefreshData,
  });
};
