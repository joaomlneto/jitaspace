import { type NextApiRequest, type NextApiResponse } from "next";
import Iron from "@hapi/iron";
import { HttpStatusCode } from "axios";
import z from "zod";

import { env } from "@jitaspace/auth/env.mjs"; // TODO: Support optionally requesting a subset of existing scopes
import {
  getEveSsoAccessTokenPayload,
  refreshEveSsoToken,
} from "@jitaspace/auth/utils";





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

  // Confirm body is an (encrypted) string
  z.string().parse(body);

  // Attempt to unseal its contents
  const decodedBody = await Iron.unseal(
    body,
    env.NEXTAUTH_SECRET,
    Iron.defaults,
  );

  // Deserialize unsealed contents back into JSON
  const { accessTokenExpiration, refreshToken } = z
    .object({
      accessTokenExpiration: z.number(),
      refreshToken: z.string(),
    })
    .parse(decodedBody);

  // FIXME TODO: Check if expiration date is within acceptable interval.

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

  const sealedRefreshData = await Iron.seal(
    {
      accessTokenExpiration: payload.exp,
      refreshToken: refresh_token,
    },
    env.NEXTAUTH_SECRET,
    Iron.defaults,
  );

  return res.json({
    accessToken: access_token,
    refreshTokenData: sealedRefreshData,
  });
}
