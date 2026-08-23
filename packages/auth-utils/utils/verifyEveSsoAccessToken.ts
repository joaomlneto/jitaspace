import type { JWTVerifyGetKey } from "jose";

import type { EveSsoAccessTokenPayload } from "./getEveSsoAccessTokenPayload";

/** EVE Online's published JWKS endpoint (from its SSO metadata). */
export const EVE_SSO_JWKS_URI = "https://login.eveonline.com/oauth/jwks";

/**
 * Accepted `iss` values. EVE has historically issued tokens with `iss` both
 * with and without the scheme, so accept both (matching CCP's own examples).
 */
export const EVE_SSO_ISSUERS = [
  "login.eveonline.com",
  "https://login.eveonline.com",
];

/**
 * The constant `aud` value EVE SSO access tokens carry (alongside the client id).
 *
 * Note this value is the *same for every EVE application*, so on its own it only
 * proves EVE minted the token — not that the token was minted for you. Pass
 * `clientId` to {@link verifyEveSsoAccessToken} to assert the latter.
 */
export const EVE_SSO_AUDIENCE = "EVE Online";

// EVE signs with the asymmetric keys published in its JWKS. Pinning to those
// algorithms prevents an attacker from presenting a forged `alg: HS256` token
// that a naive verifier might check with public-key material as the HMAC secret.
const EVE_SSO_ALGORITHMS = ["RS256", "ES256"];

// `createRemoteJWKSet` caches fetched keys (and refreshes on an unknown `kid`),
// so build it once and reuse it across calls.
let remoteJwks: JWTVerifyGetKey | undefined;

/**
 * Verify an EVE Online SSO access token: checks the JWT signature against EVE's
 * published JWKS plus the `iss`, `aud` and `exp` claims, and returns the
 * verified payload. Throws if the token is invalid, expired, or forged.
 *
 * Unlike {@link getEveSsoAccessTokenPayload} — which only base64-decodes the
 * payload — a successful call here cryptographically proves EVE issued the
 * token, so its claims can be trusted.
 *
 * **Pass `clientId` whenever the token did not come from your own
 * {@link exchangeEveSsoToken} / {@link refreshEveSsoToken} call** — most
 * importantly when verifying a bearer token presented by a client. Without it
 * the only audience checked is {@link EVE_SSO_AUDIENCE}, which every EVE
 * application's tokens carry, so a token minted for a *different* EVE
 * application verifies successfully (token substitution).
 *
 * `jose` is imported dynamically so this server-only, ESM-only dependency stays
 * out of the client bundle and out of consumers' eager module graphs (e.g. the
 * client-side `useAuthStore`, which only needs `getEveSsoAccessTokenPayload`).
 */
export async function verifyEveSsoAccessToken(
  token: string,
  options?: {
    /**
     * Your EVE application's client id. When supplied, the token's `azp`
     * (authorized party) must equal it, proving the token was issued to *your*
     * application. Checked in addition to — not instead of — `audience`.
     */
    clientId?: string;
    /** Override the key resolver — e.g. a local JWKS in tests. */
    jwks?: JWTVerifyGetKey;
    issuer?: string | string[];
    audience?: string | string[];
  },
): Promise<EveSsoAccessTokenPayload> {
  const { createRemoteJWKSet, errors, jwtVerify } = await import("jose");

  const jwks =
    options?.jwks ??
    (remoteJwks ??= createRemoteJWKSet(new URL(EVE_SSO_JWKS_URI)));

  const { payload } = await jwtVerify(token, jwks, {
    algorithms: EVE_SSO_ALGORITHMS,
    issuer: options?.issuer ?? EVE_SSO_ISSUERS,
    audience: options?.audience ?? EVE_SSO_AUDIENCE,
  });

  // `azp` (authorized party) is the client id the token was issued to, and is
  // the one claim that distinguishes our tokens from another EVE application's.
  // Deliberately not also requiring the client id in `aud`: EVE is documented to
  // put it there, but tokens carrying the bare `aud: "EVE Online"` exist too, and
  // `azp` alone is already decisive.
  const { clientId } = options ?? {};
  if (clientId !== undefined && payload.azp !== clientId) {
    throw new errors.JWTClaimValidationFailed(
      'unexpected "azp" claim value',
      payload,
      "azp",
      "check_failed",
    );
  }

  return payload as unknown as EveSsoAccessTokenPayload;
}
