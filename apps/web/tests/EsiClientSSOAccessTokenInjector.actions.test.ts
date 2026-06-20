import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// refreshCharacterToken adapts the framework-agnostic refresh handler
// (Request -> Response) to a serializable, discriminated outcome the client
// can act on:
//   2xx + token body         -> { status: "refreshed", ... }
//   410 Gone                  -> { status: "requires-reauth" }   (too old)
//   any other error / throw   -> { status: "error", message }
// We replace @jitaspace/auth so no env validation / crypto runs, and return a
// minimal Response-like object the action reads via .status / .json().
// ---------------------------------------------------------------------------

// The action builds a `new Request(...)` it never inspects (the handler is
// mocked); jsdom's jest environment may not define the Web `Request`, so stub it.
if (typeof globalThis.Request === "undefined") {
  // A bare class accepts (and ignores) the constructor args the action passes.
  (globalThis as { Request?: unknown }).Request = class {};
}

jest.mock("@jitaspace/auth", () => ({
  __esModule: true,
  refreshTokenApiRouteHandler: jest.fn(),
}));

const { refreshTokenApiRouteHandler: mockHandler } = require("@jitaspace/auth") as {
  refreshTokenApiRouteHandler: jest.MockedFunction<
    (request: Request) => Promise<Response>
  >;
};

const { refreshCharacterToken } =
  require("~/components/EsiClientSSOAccessTokenInjector.actions") as typeof import("~/components/EsiClientSSOAccessTokenInjector.actions");

/** Minimal Response-like value the action reads via `.status` / `.json()`. */
function jsonResponse(status: number, body: unknown): Response {
  return { status, json: () => Promise.resolve(body) } as unknown as Response;
}

function respondWith(status: number, body: unknown) {
  mockHandler.mockResolvedValueOnce(jsonResponse(status, body));
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
