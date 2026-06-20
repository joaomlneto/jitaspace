import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// refreshCharacterToken adapts the (Pages-style) refresh handler to a
// serializable, discriminated outcome the client can act on:
//   200 + token body        -> { status: "refreshed", ... }
//   410 Gone                 -> { status: "requires-reauth" }   (too old)
//   any other error / throw  -> { status: "error", message }
// We replace @jitaspace/auth so no env validation / crypto runs, and emulate
// the handler by writing to the response adapter it is handed.
// ---------------------------------------------------------------------------

interface ResLike {
  setHeader: () => ResLike;
  status: (code: number) => ResLike;
  json: (body: unknown) => ResLike;
}

jest.mock("@jitaspace/auth", () => ({
  __esModule: true,
  refreshTokenApiRouteHandler: jest.fn(),
}));

const { refreshTokenApiRouteHandler: mockHandler } = require("@jitaspace/auth") as {
  refreshTokenApiRouteHandler: jest.MockedFunction<
    (req: { body: string }, res: ResLike) => Promise<void>
  >;
};

const { refreshCharacterToken } =
  require("~/components/EsiClientSSOAccessTokenInjector.actions") as typeof import("~/components/EsiClientSSOAccessTokenInjector.actions");

/** Make the mocked handler respond like the real one: res.status(c).json(b). */
function respondWith(statusCode: number, body: unknown) {
  mockHandler.mockImplementationOnce((_req, res) => {
    res.status(statusCode).json(body);
    return Promise.resolve();
  });
}

describe("refreshCharacterToken", () => {
  beforeEach(() => {
    mockHandler.mockReset();
  });

  it("returns a 'refreshed' outcome with the new tokens on success", async () => {
    respondWith(200, { accessToken: "AT", refreshTokenData: "RT" });

    await expect(refreshCharacterToken("sealed")).resolves.toEqual({
      status: "refreshed",
      accessToken: "AT",
      refreshTokenData: "RT",
    });
  });

  it("maps 410 Gone to 'requires-reauth' (refresh token too old)", async () => {
    respondWith(410, { error: "Access token is too old. Must reauthenticate." });

    await expect(refreshCharacterToken("sealed")).resolves.toEqual({
      status: "requires-reauth",
    });
  });

  it("maps a non-410 error response to a transient 'error' outcome", async () => {
    respondWith(500, { error: "EVE_CLIENT_ID or EVE_CLIENT_SECRET is undefined" });

    await expect(refreshCharacterToken("sealed")).resolves.toEqual({
      status: "error",
      message: "EVE_CLIENT_ID or EVE_CLIENT_SECRET is undefined",
    });
  });

  it("does not request reauth for the benign 'too early' (425) response", async () => {
    respondWith(425, { error: "Token is not expired nor is about to expire." });

    await expect(refreshCharacterToken("sealed")).resolves.toEqual({
      status: "error",
      message: "Token is not expired nor is about to expire.",
    });
  });

  it("reports an 'error' outcome (never throws) when the handler throws", async () => {
    mockHandler.mockRejectedValueOnce(new Error("kaboom"));

    await expect(refreshCharacterToken("sealed")).resolves.toEqual({
      status: "error",
      message: "kaboom",
    });
  });
});
