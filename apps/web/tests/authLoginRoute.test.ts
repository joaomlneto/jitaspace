/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const mockCreateLoginFlow = jest.fn();

jest.mock("@jitaspace/auth", () => ({
  createLoginFlow: (...args: unknown[]) => mockCreateLoginFlow(...args),
  getOAuthFlowCookieName: (secure: boolean) =>
    secure ? "__Host-eve.oauth.flow" : "eve.oauth.flow",
  OAUTH_FLOW_MAX_AGE_SECONDS: 900,
}));

// Loaded lazily (after the mock above is registered) — a top-level import
// would be hoisted above jest.mock and pull in the real module.
const loadGET = () =>
  (require("../app/api/auth/login/route") as { GET: (req: NextRequest) => Promise<Response> })
    .GET;

const headers = {
  "x-forwarded-host": "jita.space",
  "x-forwarded-proto": "https",
};

describe("GET /api/auth/login", () => {
  beforeEach(() => {
    mockCreateLoginFlow.mockReset().mockResolvedValue({
      authorizationUrl: "https://login.eveonline.com/v2/oauth/authorize?x=1",
      sealedFlow: "SEALED-FLOW",
    });
  });

  it("parses scopes/returnTo, builds redirect_uri, redirects to EVE, sets a secure flow cookie", async () => {
    const GET = loadGET();
    const req = new NextRequest(
      "https://jita.space/api/auth/login?scope=publicData%20esi-skills.read_skills.v1&returnTo=/skills",
      { headers },
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://login.eveonline.com/v2/oauth/authorize?x=1",
    );
    expect(mockCreateLoginFlow).toHaveBeenCalledWith({
      scopes: ["publicData", "esi-skills.read_skills.v1"],
      redirectUri: "https://jita.space/api/auth/callback/eveonline",
      returnTo: "/skills",
    });

    const cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("__Host-eve.oauth.flow="));
    expect(cookie).toContain("__Host-eve.oauth.flow=SEALED-FLOW");
    expect(cookie?.toLowerCase()).toContain("httponly");
    expect(cookie?.toLowerCase()).toContain("samesite=lax");
    expect(cookie).toContain("Max-Age=900");
  });

  it("defaults returnTo to / and rejects open-redirect targets", async () => {
    const GET = loadGET();
    const req = new NextRequest(
      "https://jita.space/api/auth/login?returnTo=https://evil.example",
      { headers },
    );
    await GET(req);
    expect(mockCreateLoginFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnTo: "/", scopes: [] }),
    );
  });
});
