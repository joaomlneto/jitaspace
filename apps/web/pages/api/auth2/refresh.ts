import { type NextApiRequest, type NextApiResponse } from "next";
import { HttpStatusCode } from "axios";
import z from "zod";



import { sealDataWithAuthSecret, tokenRefreshDataSchema, unsealDataWithAuthSecret } from "@jitaspace/auth";
import { env } from "@jitaspace/auth/env.mjs"; // TODO: Support optionally requesting a subset of existing scopes
import { getEveSsoAccessTokenPayload, refreshEveSsoToken } from "@jitaspace/auth/utils"; // How much time before token expires we're willing to refresh it





// How much time before token expires we're willing to refresh it
const REFRESH_TOKEN_BEFORE_EXP_TIME = 60000;

// TODO: Support optionally requesting a subset of existing scopes
// See https://docs.esi.evetech.net/docs/sso/refreshing_access_tokens.html

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        accessToken: string;
        refreshTokenData: string;
      }
  >,
) {
  const body = req.body;
  console.log("\n\n\n\n\n\n\n\n\n\n REQUEST!!!", { body });

  // Confirm body is an (encrypted) string
  z.string().parse(body);

  console.log("RAW BODY HAS RIGHT FORMAT!!");

  // Attempt to unseal its contents
  const decodedBody = await unsealDataWithAuthSecret(body);

  console.log({ decodedBody });

  // Deserialize unsealed contents back into JSON
  const unsealedBody = tokenRefreshDataSchema.parse(decodedBody);
  console.log({ unsealedBody });
  const { accessTokenExpiration, refreshToken } = unsealedBody;

  console.log({ accessTokenExpiration, refreshToken });

  // TODO: VALIDATE TOKEN!!!

  // Check if access token is expired or is about to
  if (Date.now() < accessTokenExpiration - REFRESH_TOKEN_BEFORE_EXP_TIME) {
    return res
      .status(HttpStatusCode.TooEarly)
      .json({ error: "Token is not expired nor is about to expire." });
  }

  // Attempt to refresh token
  const { access_token, refresh_token, expires_in } = await refreshEveSsoToken({
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
}
