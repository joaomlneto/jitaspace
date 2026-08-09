/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCookieStore = {
  get: jest.fn<(name: string) => { value: string } | undefined>(),
  delete: jest.fn<(name: string) => void>(),
};
const mockReadLoginResult = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock("@jitaspace/auth", () => ({
  getOAuthResultCookieName: (secure: boolean) =>
    secure ? "__Host-eve.oauth.result" : "eve.oauth.result",
  readLoginResult: (...args: unknown[]) => mockReadLoginResult(...args),
}));

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
    mockCookieStore.get.mockReset();
    mockCookieStore.delete.mockReset();
    mockReadLoginResult.mockReset();
  });

  it("returns null and clears both cookie names when no result is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await loadConsume()()).toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "__Host-eve.oauth.result",
    );
    expect(mockCookieStore.delete).toHaveBeenCalledWith("eve.oauth.result");
  });

  it("reads, validates, returns and clears the sealed result", async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "__Host-eve.oauth.result" ? { value: "SEALED" } : undefined,
    );
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
  });

  it("returns null when the sealed value cannot be unsealed", async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "__Host-eve.oauth.result" ? { value: "TAMPERED" } : undefined,
    );
    mockReadLoginResult.mockRejectedValue(new Error("bad seal"));
    expect(await loadConsume()()).toBeNull();
  });
});
