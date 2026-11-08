/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as AuthModule from "@jitaspace/auth";

const mockCompleteLoginFlow =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSealLoginResult = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@jitaspace/auth", () => {
  const actual = jest.requireActual<typeof AuthModule>("@jitaspace/auth");
  return {
    completeLoginFlow: (...args: unknown[]) => mockCompleteLoginFlow(...args),
    sealLoginResult: (...args: unknown[]) => mockSealLoginResult(...args),
    getOAuthFlowCookieName: actual.getOAuthFlowCookieName,
    getOAuthResultCookieName: actual.getOAuthResultCookieName,
    getCookieChunkName: actual.getCookieChunkName,
    joinCookieChunks: actual.joinCookieChunks,
    splitCookieValue: actual.splitCookieValue,
    OAUTH_RESULT_MAX_AGE_SECONDS: 60,
  };
});

jest.mock("~/env", () => ({
  env: {
    EVE_CLIENT_ID: "test-eve-client-id",
    EVE_CLIENT_SECRET: "test-eve-client-secret",
    NEXTAUTH_SECRET: "test-nextauth-secret",
  },
}));

const mockCapture = jest.fn();
const mockShutdown = jest.fn((..._args: unknown[]) =>
  Promise.resolve(undefined),
);
const mockGetPostHogClient = jest.fn();
jest.mock("~/lib/posthog-server", () => ({
  getPostHogClient: () => mockGetPostHogClient(),
}));

// `after` runs its callback outside a request scope in tests; invoke it inline.
jest.mock("next/server", () => {
  const actual = jest.requireActual<Record<string, unknown>>("next/server");
  return { ...actual, after: (cb: () => unknown) => cb() };
});

// A JWT whose payload's `sub` encodes the given character id.
const accessTokenFor = (id: number) =>
  `header.${Buffer.from(
    JSON.stringify({ sub: `CHARACTER:EVE:${id}` }),
  ).toString("base64url")}.signature`;

const loadGET = () =>
  (
    require("../app/api/auth/callback/eveonline/route") as {
      GET: (req: NextRequest) => Promise<Response>;
    }
  ).GET;

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
    mockCapture.mockReset();
    mockShutdown.mockClear();
    mockGetPostHogClient
      .mockReset()
      .mockReturnValue({ capture: mockCapture, shutdown: mockShutdown });
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
      .find((c) => c.startsWith("__Host-eve.oauth.result.0="));
    expect(cookie).toContain("__Host-eve.oauth.result.0=SEALED-RESULT");
  });

  it("splits a result too large for one cookie, and expires stale chunks", async () => {
    // A 42-scope login seals to ~4.5 kB: over the browser's 4096-byte limit
    // for a single cookie, which it drops without a trace.
    const sealed = "S".repeat(4500);
    mockSealLoginResult.mockResolvedValue(sealed);
    mockCompleteLoginFlow.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
      returnTo: "/",
    });
    const req = request("code=the-code&state=the-state");
    req.cookies.set("__Host-eve.oauth.result.2", "STALE");

    const res = await loadGET()(req);

    const setCookies = res.headers.getSetCookie();
    const valueOf = (name: string) =>
      setCookies
        .find((c) => c.startsWith(`${name}=`))
        ?.split(";")[0]
        ?.slice(name.length + 1);
    const chunk0 = valueOf("__Host-eve.oauth.result.0") ?? "";
    const chunk1 = valueOf("__Host-eve.oauth.result.1") ?? "";
    expect(chunk0 + chunk1).toBe(sealed);
    for (const c of setCookies.filter((c) =>
      c.startsWith("__Host-eve.oauth.result."),
    )) {
      expect(c.split(";")[0]?.length).toBeLessThanOrEqual(4096);
    }
    const stale = setCookies.find((c) =>
      c.startsWith("__Host-eve.oauth.result.2="),
    );
    expect(stale).toMatch(/Max-Age=0/i);
  });

  it("captures login_callback_succeeded and flushes via after() for a valid token", async () => {
    mockCompleteLoginFlow.mockResolvedValue({
      accessToken: accessTokenFor(90000001),
      encryptedRefreshToken: "ERT",
      returnTo: "/",
    });

    const res = await loadGET()(request("code=the-code&state=the-state"));

    expect(res.status).toBe(307);
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "90000001",
      event: "login_callback_succeeded",
      properties: { character_id: 90000001 },
    });
    expect(mockShutdown).toHaveBeenCalled();
  });

  it("does not capture when PostHog is not configured", async () => {
    mockGetPostHogClient.mockReturnValue(null);
    mockCompleteLoginFlow.mockResolvedValue({
      accessToken: accessTokenFor(90000001),
      encryptedRefreshToken: "ERT",
      returnTo: "/",
    });

    await loadGET()(request("code=the-code&state=the-state"));

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("redirects to login_failed when completion throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockCompleteLoginFlow.mockRejectedValue(new Error("bad"));
    const res = await loadGET()(request("code=the-code&state=the-state"));
    expect(res.headers.get("location")).toContain("/?auth_error=login_failed");
  });
});
