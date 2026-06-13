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
    global.fetch = fetchMock as unknown as typeof fetch;

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
    global.fetch = fetchMock as unknown as typeof fetch;

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
    global.fetch = fetchMock as unknown as typeof fetch;

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
    global.fetch = fetchMock as unknown as typeof fetch;

    await refreshEveSsoToken(params);
    await refreshEveSsoToken({ ...params, scopes: [] });

    const bodies = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).body as URLSearchParams,
    );
    expect(bodies[0]?.has("scope")).toBe(false);
    expect(bodies[1]?.has("scope")).toBe(false);
  });

  it("throws 'error refreshing access token' when response is not ok", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    }) as unknown as typeof fetch;

    await expect(refreshEveSsoToken(params)).rejects.toThrow(
      "error refreshing access token",
    );
  });

  it("calls console.error when the token endpoint responds with a non-OK status", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }) as unknown as typeof fetch;

    await expect(refreshEveSsoToken(params)).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error refreshing EVE SSO token" }),
    );
  });
});
