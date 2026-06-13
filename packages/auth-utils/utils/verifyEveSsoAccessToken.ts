import type { JWTVerifyGetKey } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

/** The constant `aud` value EVE SSO access tokens carry (alongside the client id). */
export const EVE_SSO_AUDIENCE = "EVE Online";

// EVE signs with the asymmetric keys published in its JWKS. Pinning to those
// algorithms prevents an attacker from presenting a forged `alg: HS256` token
// that a naive verifier might check with public-key material as the HMAC secret.
const EVE_SSO_ALGORITHMS = ["RS256", "ES256"];

// `createRemoteJWKSet` caches fetched keys (and refreshes on an unknown `kid`),
// so build it once and reuse it across calls.
let remoteJwks: JWTVerifyGetKey | undefined;
const defaultJwks = (): JWTVerifyGetKey =>
  (remoteJwks ??= createRemoteJWKSet(new URL(EVE_SSO_JWKS_URI)));

/**
 * Verify an EVE Online SSO access token: checks the JWT signature against EVE's
 * published JWKS plus the `iss`, `aud` and `exp` claims, and returns the
 * verified payload. Throws if the token is invalid, expired, or forged.
 *
 * Unlike {@link getEveSsoAccessTokenPayload} — which only base64-decodes the
 * payload — a successful call here cryptographically proves EVE issued the
 * token, so its claims can be trusted.
 */
export async function verifyEveSsoAccessToken(
  token: string,
  options?: {
    /** Override the key resolver — e.g. a local JWKS in tests. */
    jwks?: JWTVerifyGetKey;
    issuer?: string | string[];
    audience?: string | string[];
  },
): Promise<EveSsoAccessTokenPayload> {
  const { payload } = await jwtVerify(token, options?.jwks ?? defaultJwks(), {
    algorithms: EVE_SSO_ALGORITHMS,
    issuer: options?.issuer ?? EVE_SSO_ISSUERS,
    audience: options?.audience ?? EVE_SSO_AUDIENCE,
  });

  return payload as unknown as EveSsoAccessTokenPayload;
}
