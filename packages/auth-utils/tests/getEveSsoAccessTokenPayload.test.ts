import { getEveSsoAccessTokenPayload } from "../utils/getEveSsoAccessTokenPayload";

function makeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64");
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
});
