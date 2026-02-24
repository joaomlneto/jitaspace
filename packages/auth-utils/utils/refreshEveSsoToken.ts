export const REFRESH_TOKEN_ENDPOINT =
  "https://login.eveonline.com/v2/oauth/token";

// TODO: Add option to specify subset of existing scopes
// See https://docs.esi.evetech.net/docs/sso/refreshing_access_tokens.html

type SsoRefreshTokenSuccessResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

export const refreshEveSsoToken = async (params: {
  eveClientId: string;
  eveClientSecret: string;
  refreshToken: string;
}): Promise<SsoRefreshTokenSuccessResult> => {
  const { eveClientId, eveClientSecret, refreshToken } = params;

  // Base64 encode the client ID and secret
  const headerString = `${eveClientId}:${eveClientSecret}`;
  const buff = Buffer.from(headerString, "utf-8");
  const authHeader = buff.toString("base64");

  const refreshedTokensResponse = await fetch(REFRESH_TOKEN_ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
      Host: "login.eveonline.com",
    },
  });

  if (!refreshedTokensResponse.ok) {
    console.log({
      message: "Error refreshing EVE SSO token",
      status: refreshedTokensResponse.status,
      statusText: refreshedTokensResponse.statusText,
      params: {
        eveClientId,
        eveClientSecret: "[REDACTED]",
        refreshToken: "[REDACTED]",
      },
    });
    console.log(refreshedTokensResponse.body);
    throw new Error("error refreshing access token");
  }

  const refreshResult =
    (await refreshedTokensResponse.json()) as SsoRefreshTokenSuccessResult;
  //console.log({ refreshResult });

  return refreshResult;
};
