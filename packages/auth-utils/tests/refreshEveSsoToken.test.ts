import {
  REFRESH_TOKEN_ENDPOINT,
  refreshEveSsoToken,
} from "../utils/refreshEveSsoToken";

const params = {
  eveClientId: "cid",
  eveClientSecret: "secret",
  refreshToken: "rt-abc123",
};

describe("refreshEveSsoToken", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts refresh_token grant with Basic auth and returns tokens on success", async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: "NEW_AT",
      refresh_token: "NEW_RT",
      expires_in: 1199,
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json });
    global.fetch = fetchMock;

    const result = await refreshEveSsoToken(params);

    expect(result.access_token).toBe("NEW_AT");
    expect(result.refresh_token).toBe("NEW_RT");
    expect(result.expires_in).toBe(1199);
  });

  it("calls fetch with the correct URL, method, body params, and Authorization header", async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: "AT",
      refresh_token: "RT",
      expires_in: 1199,
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json });
    global.fetch = fetchMock;

    await refreshEveSsoToken(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(REFRESH_TOKEN_ENDPOINT);
    expect(init.method).toBe("POST");

    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt-abc123");

    const headers = init.headers as Record<string, string>;
    const expectedAuth = `Basic ${Buffer.from("cid:secret").toString("base64")}`;
    expect(headers.Authorization).toBe(expectedAuth);
  });

  it("sends a narrowed `scope` param when scopes are provided", async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: "AT",
      refresh_token: "RT",
      expires_in: 1199,
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json });
    global.fetch = fetchMock;

    await refreshEveSsoToken({
      ...params,
      scopes: [
        "esi-skills.read_skills.v1",
        "esi-wallet.read_character_wallet.v1",
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.get("scope")).toBe(
      "esi-skills.read_skills.v1 esi-wallet.read_character_wallet.v1",
    );
  });

  it("omits `scope` when scopes are absent or empty", async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: "AT",
      refresh_token: "RT",
      expires_in: 1199,
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json });
    global.fetch = fetchMock;

    await refreshEveSsoToken(params);
    await refreshEveSsoToken({ ...params, scopes: [] });

    const bodies = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).body as URLSearchParams,
    );
    expect(bodies[0]?.has("scope")).toBe(false);
    expect(bodies[1]?.has("scope")).toBe(false);
  });

  const failWith = (status: number, body: string) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: "",
      text: jest.fn().mockResolvedValue(body),
    });
  };

  // The distinction this whole error type exists for: a revoked refresh token
  // is terminal, a 5xx is worth retrying, and the caller can only tell them
  // apart if the RFC 6749 payload survives.
  it("flags invalid_grant as requiring re-authentication", async () => {
    failWith(
      400,
      JSON.stringify({
        error: "invalid_grant",
        error_description: "The refresh token is expired or revoked",
      }),
    );

    await expect(refreshEveSsoToken(params)).rejects.toMatchObject({
      name: "EveSsoTokenError",
      status: 400,
      error: "invalid_grant",
      requiresReauthentication: true,
    });
  });

  it("does not flag a server error as requiring re-authentication", async () => {
    failWith(500, JSON.stringify({ error: "server_error" }));

    await expect(refreshEveSsoToken(params)).rejects.toMatchObject({
      status: 500,
      error: "server_error",
      requiresReauthentication: false,
    });
  });

  // EVE 5xx responses and CDN edge errors return HTML. Parsing that with a bare
  // response.json() would replace a clean auth error with a SyntaxError.
  it("survives a non-JSON body and keeps it on the error", async () => {
    failWith(502, "<html><body>Bad Gateway</body></html>");

    const error = await refreshEveSsoToken(params).catch((e: unknown) => e);
    expect(error).toMatchObject({
      name: "EveSsoTokenError",
      status: 502,
      body: "<html><body>Bad Gateway</body></html>",
    });
    expect((error as { error?: string }).error).toBeUndefined();
  });

  it("does not log the client secret when the refresh fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    failWith(401, "");

    await expect(refreshEveSsoToken(params)).rejects.toBeDefined();
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
