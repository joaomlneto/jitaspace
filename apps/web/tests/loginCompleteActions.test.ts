/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as AuthModule from "@jitaspace/auth";

let mockJar: { name: string; value: string }[] = [];
const mockCookieStore = {
  getAll: jest.fn(() => mockJar),
  set: jest.fn<(name: string, value: string, options: unknown) => void>(),
};
const mockReadLoginResult = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock("@jitaspace/auth", () => {
  const actual = jest.requireActual<typeof AuthModule>("@jitaspace/auth");
  return {
    getOAuthResultCookieName: actual.getOAuthResultCookieName,
    joinCookieChunks: actual.joinCookieChunks,
    readLoginResult: (...args: unknown[]) => mockReadLoginResult(...args),
  };
});

jest.mock("~/env", () => ({
  env: { NEXTAUTH_SECRET: "test-nextauth-secret" },
}));

const loadConsume = () =>
  (
    require("../app/login/complete/actions") as {
      consumeLoginResult: () => Promise<unknown>;
    }
  ).consumeLoginResult;

describe("consumeLoginResult", () => {
  beforeEach(() => {
    mockJar = [];
    mockCookieStore.getAll.mockClear();
    mockCookieStore.set.mockReset();
    mockReadLoginResult.mockReset();
  });

  it("returns null without unsealing when no result is present", async () => {
    expect(await loadConsume()()).toBeNull();
    expect(mockReadLoginResult).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("joins the chunks in order, returns the result and expires every chunk", async () => {
    mockJar = [
      { name: "__Host-eve.oauth.result.1", value: "LED" },
      { name: "other", value: "x" },
      { name: "__Host-eve.oauth.result.0", value: "SEA" },
    ];
    mockReadLoginResult.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });
    expect(await loadConsume()()).toEqual({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });
    expect(mockReadLoginResult).toHaveBeenCalledWith("SEALED", {
      nextAuthSecret: "test-nextauth-secret",
    });
    // `__Host-` cookies are only deleted when written back with Secure.
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "__Host-eve.oauth.result.0",
      "",
      { path: "/", secure: true, maxAge: 0 },
    );
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "__Host-eve.oauth.result.1",
      "",
      { path: "/", secure: true, maxAge: 0 },
    );
    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
  });

  it("reads the unprefixed chunks set over plain http", async () => {
    mockJar = [{ name: "eve.oauth.result.0", value: "SEALED" }];
    mockReadLoginResult.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });
    expect(await loadConsume()()).not.toBeNull();
    expect(mockCookieStore.set).toHaveBeenCalledWith("eve.oauth.result.0", "", {
      path: "/",
      maxAge: 0,
    });
  });

  it("returns null when the sealed value cannot be unsealed", async () => {
    mockJar = [{ name: "__Host-eve.oauth.result.0", value: "TAMPERED" }];
    mockReadLoginResult.mockRejectedValue(new Error("bad seal"));
    expect(await loadConsume()()).toBeNull();
  });
});
