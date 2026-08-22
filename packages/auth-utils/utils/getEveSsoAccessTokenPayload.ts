import type { ESIScope } from "@jitaspace/esi-metadata";

import { base64UrlToUtf8 } from "./base64";

export interface EveSsoAccessTokenPayload {
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded: EveSsoAccessTokenPayload = JSON.parse(
      base64UrlToUtf8(tokenPayload),
    );
    return decoded;
  } catch {
    return null;
  }
}
