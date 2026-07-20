/**
 * Decodes the EVE Online character id from an EVE SSO access token (a JWT).
 *
 * The token's `sub` claim has the form `CHARACTER:EVE:<characterId>`. This does
 * NOT verify the token signature — it is only used to attach a stable
 * distinct id to analytics events and must not be used for authorization.
 *
 * Returns `undefined` if the token is malformed or the id can't be parsed.
 */
export function extractCharacterIdFromAccessToken(
  accessToken: string,
): number | undefined {
  try {
    const payloadB64 = accessToken.split(".")[1];
    if (!payloadB64) return undefined;
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    ) as { sub?: string };
    const parts = payload.sub?.split(":");
    const id = parts ? Number(parts[2]) : NaN;
    return Number.isFinite(id) ? id : undefined;
  } catch {
    return undefined;
  }
}
