import {
  exchangeEveSsoToken,
  TOKEN_ENDPOINT,
} from "../utils/exchangeEveSsoToken";

const params = {
  eveClientId: "cid",
  eveClientSecret: "secret",
  code: "auth-code",
  codeVerifier: "verifier-123",
};

describe("exchangeEveSsoToken", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts the authorization_code grant with PKCE + Basic auth and returns tokens", async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: "AT",
      refresh_token: "RT",
      expires_in: 1199,
      token_type: "Bearer",
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json });
    global.fetch = fetchMock;

    const result = await exchangeEveSsoToken(params);

    expect(result.access_token).toBe("AT");
    expect(result.refresh_token).toBe("RT");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_ENDPOINT);
    expect(init.method).toBe("POST");

    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("verifier-123");

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("cid:secret").toString("base64")}`,
    );
  });

  it("throws when the token endpoint responds with a non-OK status", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

    await expect(exchangeEveSsoToken(params)).rejects.toThrow(
      "error exchanging authorization code",
    );
  });
});
