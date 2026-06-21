export const REFRESH_TOKEN_ENDPOINT =
  "https://login.eveonline.com/v2/oauth/token";

interface SsoRefreshTokenSuccessResult {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export const refreshEveSsoToken = async (params: {
  eveClientId: string;
  eveClientSecret: string;
  refreshToken: string;
  /**
   * Optionally request a *subset* of the scopes the refresh token was
   * originally granted. Per RFC 6749 §6 you may narrow the scope set on a
   * refresh but never broaden it. When omitted (or empty) the refreshed token
   * keeps the full original scope set.
   */
  scopes?: string[];
}): Promise<SsoRefreshTokenSuccessResult> => {
  const { eveClientId, eveClientSecret, refreshToken, scopes } = params;

  // Base64 encode the client ID and secret
  const headerString = `${eveClientId}:${eveClientSecret}`;
  const buff = Buffer.from(headerString, "utf-8");
  const authHeader = buff.toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  // Only send `scope` when narrowing — an empty value would be rejected.
  if (scopes && scopes.length > 0) {
    body.set("scope", scopes.join(" "));
  }

  const refreshedTokensResponse = await fetch(REFRESH_TOKEN_ENDPOINT, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
      Host: "login.eveonline.com",
    },
  });

  if (!refreshedTokensResponse.ok) {
    console.error({
      message: "Error refreshing EVE SSO token",
      status: refreshedTokensResponse.status,
      statusText: refreshedTokensResponse.statusText,
    });
    throw new Error("error refreshing access token");
  }

  const refreshResult =
    (await refreshedTokensResponse.json()) as SsoRefreshTokenSuccessResult;
  //console.log({ refreshResult });

  return refreshResult;
};
