import { type ESIScope } from "@jitaspace/esi-client";





export type EveSsoAccessTokenPayload = {
  scp: ESIScope[];
  jti: string;
  kid: string;
  sub: string;
  azp: string;
  tenant: string;
  tier: string;
  region: string;
  aud: string;
  name: string;
  owner: string;
  exp: number;
  iat: number;
  iss: string;
};

export function getEveSsoAccessTokenPayload(
  token: string | undefined,
): EveSsoAccessTokenPayload | null {
  if (!token) return null;

  const tokenPayload = token.split(".")[1];
  if (!tokenPayload) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const decoded: EveSsoAccessTokenPayload = JSON.parse(
    Buffer.from(tokenPayload, "base64").toString(),
  );
  return decoded;
}
