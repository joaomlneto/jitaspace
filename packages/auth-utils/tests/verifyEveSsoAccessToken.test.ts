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

const OUR_CLIENT_ID = "our-client-id";
const OTHER_CLIENT_ID = "some-other-eve-app";

const mintToken = (
  signer: CryptoKey,
  claims: {
    iss?: string;
    aud?: string | string[];
    azp?: string;
    expSecondsFromNow?: number;
  } = {},
) => {
  const {
    iss = "login.eveonline.com",
    aud = EVE_SSO_AUDIENCE,
    azp = OUR_CLIENT_ID,
    expSecondsFromNow = 1200,
  } = claims;

  return new SignJWT({ sub: "CHARACTER:EVE:123", scp: ["publicData"], azp })
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSecondsFromNow)
    .sign(signer);
};

/** A real EVE token's `aud` carries the client id alongside the constant. */
const eveAudience = (clientId: string) => [clientId, EVE_SSO_AUDIENCE];

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

  describe("clientId binding", () => {
    it("resolves when the token was issued to this application", async () => {
      const token = await mintToken(signingKey, {
        aud: eveAudience(OUR_CLIENT_ID),
        azp: OUR_CLIENT_ID,
      });
      const payload = await verifyEveSsoAccessToken(token, {
        jwks,
        clientId: OUR_CLIENT_ID,
      });
      expect(payload.sub).toBe("CHARACTER:EVE:123");
    });

    // The whole point of the option: "EVE Online" is in every EVE app's tokens,
    // so without `clientId` a validly-signed token from another application is
    // indistinguishable from one of ours (token substitution).
    it("rejects a validly-signed token issued to a different EVE application", async () => {
      const token = await mintToken(signingKey, {
        aud: eveAudience(OTHER_CLIENT_ID),
        azp: OTHER_CLIENT_ID,
      });

      await expect(
        verifyEveSsoAccessToken(token, { jwks, clientId: OUR_CLIENT_ID }),
      ).rejects.toMatchObject({ claim: "azp" });

      // …and is accepted without `clientId`, which is why it must be passed.
      await expect(
        verifyEveSsoAccessToken(token, { jwks }),
      ).resolves.toBeDefined();
    });

    // EVE is documented to put the client id in `aud`, but tokens carrying the
    // bare constant exist too (see the fixture in
    // getEveSsoAccessTokenPayload.test.ts), so `azp` must carry the check alone.
    it('accepts the bare `aud: "EVE Online"` form when azp matches', async () => {
      const token = await mintToken(signingKey, {
        aud: EVE_SSO_AUDIENCE,
        azp: OUR_CLIENT_ID,
      });
      await expect(
        verifyEveSsoAccessToken(token, { jwks, clientId: OUR_CLIENT_ID }),
      ).resolves.toBeDefined();
    });

    it("still enforces the constant audience alongside the client id", async () => {
      const token = await mintToken(signingKey, {
        aud: [OUR_CLIENT_ID],
        azp: OUR_CLIENT_ID,
      });
      await expect(
        verifyEveSsoAccessToken(token, { jwks, clientId: OUR_CLIENT_ID }),
      ).rejects.toBeDefined();
    });
  });
});
