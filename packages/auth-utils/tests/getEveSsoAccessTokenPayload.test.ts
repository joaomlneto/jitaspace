import { getEveSsoAccessTokenPayload } from "../utils/getEveSsoAccessTokenPayload";

function makeJwt(payload: object): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${header}.${body}.fakesignature`;
}

const samplePayload = {
  scp: ["esi-skills.read_skills.v1"],
  jti: "jti-test-value",
  kid: "JWT-Signature-Key",
  sub: "CHARACTER:EVE:12345678",
  azp: "myclientid",
  tenant: "tranquility",
  tier: "live",
  region: "world",
  aud: "EVE Online",
  name: "Test Character",
  owner: "abc123",
  exp: 1717000000,
  iat: 1716996400,
  iss: "login.eveonline.com",
};

describe("getEveSsoAccessTokenPayload", () => {
  it("returns null for undefined", () => {
    expect(getEveSsoAccessTokenPayload(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getEveSsoAccessTokenPayload("")).toBeNull();
  });

  it("returns null for a non-JWT string with no dots", () => {
    expect(getEveSsoAccessTokenPayload("notavalidtoken")).toBeNull();
  });

  it("returns null when there is only one segment (one dot, no second segment)", () => {
    expect(getEveSsoAccessTokenPayload("header.")).toBeNull();
  });

  it("decodes and returns the payload object for a valid crafted JWT", () => {
    const token = makeJwt(samplePayload);
    const result = getEveSsoAccessTokenPayload(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe("CHARACTER:EVE:12345678");
    expect(result!.name).toBe("Test Character");
    expect(result!.tenant).toBe("tranquility");
    expect(result!.tier).toBe("live");
    expect(result!.region).toBe("world");
    expect(result!.iss).toBe("login.eveonline.com");
    expect(result!.exp).toBe(1717000000);
    expect(result!.iat).toBe(1716996400);
    expect(result!.scp).toEqual(["esi-skills.read_skills.v1"]);
  });

  // Real JWT segments are base64URL: the `-`/`_` alphabet, and no `=` padding.
  // `Buffer.from(x, "base64")` tolerated that silently; `atob` does not, so the
  // decoder has to normalise before decoding.
  describe("base64url segments", () => {
    const makeRealJwt = (payload: object): string =>
      [
        Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
          "base64url",
        ),
        Buffer.from(JSON.stringify(payload)).toString("base64url"),
        "fakesignature",
      ].join(".");

    it("decodes a payload whose segment uses the `-`/`_` alphabet", () => {
      // These bytes encode to a segment containing base64url-only characters,
      // which a naive `atob` rejects outright.
      const payload = { ...samplePayload, owner: "ûÿþðè¿" };
      expect(makeRealJwt(payload).split(".")[1]).toMatch(/[-_]/);

      const result = getEveSsoAccessTokenPayload(makeRealJwt(payload));
      expect(result?.owner).toBe("ûÿþðè¿");
      expect(result?.sub).toBe("CHARACTER:EVE:12345678");
    });

    // Unpadded segments come in three lengths mod 4; only 2 and 3 need padding
    // restored before `atob` will accept them. Cover all three.
    it.each([0, 1, 2, 3, 4, 5])(
      "decodes an unpadded segment with %i filler chars",
      (fillerLength) => {
        const payload = { ...samplePayload, owner: "x".repeat(fillerLength) };
        const segment = makeRealJwt(payload).split(".")[1]!;
        expect(segment).not.toContain("=");

        expect(getEveSsoAccessTokenPayload(makeRealJwt(payload))?.owner).toBe(
          "x".repeat(fillerLength),
        );
      },
    );

    it("decodes non-ASCII character names as UTF-8, not Latin-1", () => {
      // `atob` alone returns a binary string, which would mojibake this.
      const result = getEveSsoAccessTokenPayload(
        makeRealJwt({ ...samplePayload, name: "Jörg 秘密 🚀" }),
      );
      expect(result?.name).toBe("Jörg 秘密 🚀");
    });
  });

  // The signature promises `| null`, so malformed input must not throw.
  describe("malformed tokens", () => {
    it("returns null when the payload segment is not valid base64", () => {
      expect(
        getEveSsoAccessTokenPayload("header.!!!not-base64!!!.sig"),
      ).toBeNull();
    });

    it("returns null when the payload segment is not JSON", () => {
      const notJson = Buffer.from("this is not json").toString("base64url");
      expect(getEveSsoAccessTokenPayload(`header.${notJson}.sig`)).toBeNull();
    });
  });
});
