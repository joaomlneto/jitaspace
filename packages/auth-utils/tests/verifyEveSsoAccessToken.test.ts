import type { JWTVerifyGetKey } from "jose";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

import {
  EVE_SSO_AUDIENCE,
  verifyEveSsoAccessToken,
} from "../utils/verifyEveSsoAccessToken";

const KID = "test-eve-key";

let signingKey: CryptoKey; // matches the key published in `jwks`
let foreignKey: CryptoKey; // a key NOT published in `jwks`
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  signingKey = pair.privateKey;

  const publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = KID;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  jwks = createLocalJWKSet({ keys: [publicJwk] });

  const foreign = await generateKeyPair("RS256", { extractable: true });
  foreignKey = foreign.privateKey;
});

const mintToken = (
  signer: CryptoKey,
  claims: { iss?: string; aud?: string; expSecondsFromNow?: number } = {},
) => {
  const {
    iss = "login.eveonline.com",
    aud = EVE_SSO_AUDIENCE,
    expSecondsFromNow = 1200,
  } = claims;

  return new SignJWT({ sub: "CHARACTER:EVE:123", scp: ["publicData"] })
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSecondsFromNow)
    .sign(signer);
};

describe("verifyEveSsoAccessToken", () => {
  it("resolves with the payload for a validly-signed EVE token", async () => {
    const token = await mintToken(signingKey);
    const payload = await verifyEveSsoAccessToken(token, { jwks });
    expect(payload.sub).toBe("CHARACTER:EVE:123");
    expect(payload.scp).toEqual(["publicData"]);
  });

  it("accepts the scheme-prefixed issuer as well", async () => {
    const token = await mintToken(signingKey, {
      iss: "https://login.eveonline.com",
    });
    await expect(
      verifyEveSsoAccessToken(token, { jwks }),
    ).resolves.toBeDefined();
  });

  it("rejects a token signed by a key not present in the JWKS", async () => {
    const token = await mintToken(foreignKey);
    await expect(
      verifyEveSsoAccessToken(token, { jwks }),
    ).rejects.toBeDefined();
  });

  it("rejects an unexpected issuer", async () => {
    const token = await mintToken(signingKey, { iss: "https://evil.example" });
    await expect(
      verifyEveSsoAccessToken(token, { jwks }),
    ).rejects.toBeDefined();
  });

  it("rejects an unexpected audience", async () => {
    const token = await mintToken(signingKey, { aud: "Some Other App" });
    await expect(
      verifyEveSsoAccessToken(token, { jwks }),
    ).rejects.toBeDefined();
  });

  it("rejects an expired token", async () => {
    const token = await mintToken(signingKey, { expSecondsFromNow: -60 });
    await expect(
      verifyEveSsoAccessToken(token, { jwks }),
    ).rejects.toBeDefined();
  });
});
