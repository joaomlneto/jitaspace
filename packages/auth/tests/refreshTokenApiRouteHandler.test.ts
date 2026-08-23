import type * as AuthUtils from "@jitaspace/auth-utils";
import {
  EveSsoTokenError,
  refreshEveSsoToken,
  verifyEveSsoAccessToken,
} from "@jitaspace/auth-utils";

import { refreshTokenApiRouteHandler } from "../src/refreshTokenApiRouteHandler";
import { sealDataWithAuthSecret } from "../utils/sealDataWithAuthSecret";

// Keep the real EveSsoTokenError — the handler branches on `instanceof`, so a
// mocked class would make the test pass for the wrong reason.
jest.mock("@jitaspace/auth-utils", () => ({
  ...jest.requireActual<typeof AuthUtils>("@jitaspace/auth-utils"),
  refreshEveSsoToken: jest.fn(),
  verifyEveSsoAccessToken: jest.fn(),
}));

const nextAuthSecret = "0123456789abcdef0123456789abcdef";
const config = {
  nextAuthSecret,
  eveClientId: "test-client-id",
  eveClientSecret: "test-client-secret",
};

/** A sealed body whose access token expired a minute ago, so a refresh is due. */
const expiredRequest = async () =>
  new Request("https://jita.space/api/refresh", {
    method: "POST",
    body: await sealDataWithAuthSecret({
      data: {
        accessTokenExpiration: Math.floor(Date.now() / 1000) - 60,
        refreshToken: "RT",
      },
      secret: nextAuthSecret,
    }),
  });

describe("refreshTokenApiRouteHandler", () => {
  it("maps invalid_grant onto 410 so the caller prompts re-authentication", async () => {
    (refreshEveSsoToken as jest.Mock).mockRejectedValue(
      new EveSsoTokenError("revoked", {
        status: 400,
        error: "invalid_grant",
        errorDescription: "The refresh token is expired or revoked",
      }),
    );

    const response = await refreshTokenApiRouteHandler(
      await expiredRequest(),
      config,
    );

    // 410 is the status apps/web already translates into `requires-reauth`.
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "EVE rejected the refresh token. Must reauthenticate.",
    });
  });

  it("lets a server error propagate so the caller retries it as transient", async () => {
    (refreshEveSsoToken as jest.Mock).mockRejectedValue(
      new EveSsoTokenError("boom", { status: 500, error: "server_error" }),
    );

    await expect(
      refreshTokenApiRouteHandler(await expiredRequest(), config),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("returns the refreshed tokens on success", async () => {
    (refreshEveSsoToken as jest.Mock).mockResolvedValue({
      access_token: "AT2",
      refresh_token: "RT2",
      expires_in: 1199,
    });
    (verifyEveSsoAccessToken as jest.Mock).mockResolvedValue({
      exp: Math.floor(Date.now() / 1000) + 1199,
      sub: "CHARACTER:EVE:123",
    });

    const response = await refreshTokenApiRouteHandler(
      await expiredRequest(),
      config,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { accessToken: string };
    expect(body.accessToken).toBe("AT2");
    // The refreshed token must be verified against this application's client id.
    expect(verifyEveSsoAccessToken).toHaveBeenCalledWith(
      "AT2",
      expect.objectContaining({ clientId: config.eveClientId }),
    );
  });
});
