export const EVE_AUTHORIZE_URL =
  "https://login.eveonline.com/v2/oauth/authorize";

// State + PKCE cookie lifetime: bounds how long an in-flight login may take.
// Matches what next-auth used for its `state`/`pkce` check cookies.
export const OAUTH_FLOW_MAX_AGE_SECONDS = 60 * 15; // 15 minutes

// The freshly-minted tokens are handed to the client via a single-use cookie;
// keep its lifetime tiny.
export const OAUTH_RESULT_MAX_AGE_SECONDS = 60; // 1 minute

export const PKCE_CODE_CHALLENGE_METHOD = "S256";
