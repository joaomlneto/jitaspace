import type { ESIScope } from "@jitaspace/esi-metadata";

import { base64UrlToUtf8 } from "./base64";

export interface EveSsoAccessTokenPayload {
  /**
   * The scopes the token grants, always as a list. EVE writes the claim three
   * ways (a list, a bare string for a lone scope, or not at all for a login
   * that asked for none), and {@link normalizeEveSsoScopes} folds them into one.
   */
  scp: ESIScope[];
  jti: string;
  kid: string;
  sub: string;
  azp: string;
  tenant: string;
  tier: string;
  region: string;
  /** EVE issues an array — the client id the token was minted for, plus "EVE Online". */
  aud: string | string[];
  name: string;
  owner: string;
  exp: number;
  iat: number;
  iss: string;
}

/**
 * An EVE SSO `scp` claim as a list of scopes.
 *
 * EVE writes several scopes as a list, a lone scope as a bare string, and
 * leaves the claim out of a token that grants none. Callers ask
 * `scp.includes(scope)`, which throws on the missing claim and matches
 * substrings on the bare string, so both are folded into a list here.
 */
export function normalizeEveSsoScopes(scp: unknown): ESIScope[] {
  if (Array.isArray(scp)) return scp as ESIScope[];
  return typeof scp === "string" && scp !== "" ? [scp] : [];
}

export function getEveSsoAccessTokenPayload(
  token: string | undefined,
): EveSsoAccessTokenPayload | null {
  if (!token) return null;

  const tokenPayload = token.split(".")[1];
  if (!tokenPayload) {
    return null;
  }

  // Honour the `| null` return contract for *every* malformed input, not just a
  // missing segment. Decoding can fail two ways — `atob` rejects a segment that
  // is not valid base64, and `JSON.parse` rejects a payload that is not JSON —
  // and the token here is untrusted input, so neither should escape as a throw.
  try {
    const decoded: unknown = JSON.parse(base64UrlToUtf8(tokenPayload));
    // A JWT payload is a JSON object. Valid JSON of another kind (`null`, a
    // number) is as malformed as a segment that does not parse.
    if (typeof decoded !== "object" || decoded === null) return null;
    const payload = decoded as EveSsoAccessTokenPayload;
    return { ...payload, scp: normalizeEveSsoScopes(payload.scp) };
  } catch {
    return null;
  }
}
