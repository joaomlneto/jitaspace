export const REFRESH_TOKEN_ENDPOINT =
  "https://login.eveonline.com/v2/oauth/token";

// TODO: Add option to specify subset of existing scopes
// See https://docs.esi.evetech.net/docs/sso/refreshing_access_tokens.html

export const refreshEveSsoToken = async (params: {
  eveClientId: string;
  eveClientSecret: string;
  refreshToken: string;
}): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> => {
  const { eveClientId, eveClientSecret, refreshToken } = params;

  // Base64 encode the client ID and secret
  const headerString = `${eveClientId}:${eveClientSecret}`;
  const buff = Buffer.from(headerString, "utf-8");
  const authHeader = buff.toString("base64");

  const refreshedTokensResponse = await fetch(REFRESH_TOKEN_ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken as string,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
      Host: "login.eveonline.com",
    },
  });

  if (!refreshedTokensResponse.ok) {
    console.log({ params });
    console.log(refreshedTokensResponse.body);
    throw new Error("error refreshing access token");
  }

  const refreshResult = await refreshedTokensResponse.json();
  console.log({ refreshResult });

  return refreshResult;
};
