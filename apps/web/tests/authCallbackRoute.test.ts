/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const mockCompleteLoginFlow = jest.fn();
const mockSealLoginResult = jest.fn();

jest.mock("@jitaspace/auth", () => ({
  completeLoginFlow: (...args: unknown[]) => mockCompleteLoginFlow(...args),
  sealLoginResult: (...args: unknown[]) => mockSealLoginResult(...args),
  getOAuthFlowCookieName: (secure: boolean) =>
    secure ? "__Host-eve.oauth.flow" : "eve.oauth.flow",
  getOAuthResultCookieName: (secure: boolean) =>
    secure ? "__Host-eve.oauth.result" : "eve.oauth.result",
  OAUTH_RESULT_MAX_AGE_SECONDS: 60,
}));

const loadGET = () =>
  (require("../app/api/auth/callback/eveonline/route") as { GET: (req: NextRequest) => Promise<Response> })
    .GET;

const headers = {
  "x-forwarded-host": "jita.space",
  "x-forwarded-proto": "https",
};

const request = (qs: string) =>
  new NextRequest(`https://jita.space/api/auth/callback/eveonline?${qs}`, {
    headers,
  });

describe("GET /api/auth/callback/eveonline", () => {
  beforeEach(() => {
    mockCompleteLoginFlow.mockReset();
    mockSealLoginResult.mockReset().mockResolvedValue("SEALED-RESULT");
  });

  it("redirects home with auth_error when the provider reports an error", async () => {
    const res = await loadGET()(request("error=access_denied"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/?auth_error=access_denied");
    expect(mockCompleteLoginFlow).not.toHaveBeenCalled();
  });

  it("on success seals the result and redirects to /login/complete", async () => {
    mockCompleteLoginFlow.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
      returnTo: "/skills",
    });
    const res = await loadGET()(request("code=the-code&state=the-state"));
    expect(res.headers.get("location")).toContain(
      "/login/complete?returnTo=%2Fskills",
    );
    const cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("__Host-eve.oauth.result="));
    expect(cookie).toContain("__Host-eve.oauth.result=SEALED-RESULT");
  });

  it("redirects to login_failed when completion throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockCompleteLoginFlow.mockRejectedValue(new Error("bad"));
    const res = await loadGET()(request("code=the-code&state=the-state"));
    expect(res.headers.get("location")).toContain("/?auth_error=login_failed");
  });
});
