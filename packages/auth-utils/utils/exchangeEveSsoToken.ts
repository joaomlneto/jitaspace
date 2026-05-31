export const TOKEN_ENDPOINT = "https://login.eveonline.com/v2/oauth/token";

interface SsoTokenSuccessResult {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
}

/**
 * Exchange an authorization code (with PKCE `code_verifier`) for tokens.
 *
 * Uses HTTP Basic client authentication, mirroring {@link refreshEveSsoToken}.
 * Per the EVE SSO docs the token request does not include `redirect_uri`.
 * @see https://docs.esi.evetech.net/docs/sso/web_based_sso_flow.html
 */
export const exchangeEveSsoToken = async (params: {
  eveClientId: string;
  eveClientSecret: string;
  code: string;
  codeVerifier: string;
}): Promise<SsoTokenSuccessResult> => {
  const { eveClientId, eveClientSecret, code, codeVerifier } = params;

  // Base64 encode the client ID and secret for the Basic auth header
  const headerString = `${eveClientId}:${eveClientSecret}`;
  const authHeader = Buffer.from(headerString, "utf-8").toString("base64");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
      Host: "login.eveonline.com",
    },
  });

  if (!response.ok) {
    console.error({
      message: "Error exchanging EVE SSO authorization code",
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("error exchanging authorization code");
  }

  return (await response.json()) as SsoTokenSuccessResult;
};
