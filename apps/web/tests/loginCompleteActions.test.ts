/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCookieStore = { get: jest.fn(), delete: jest.fn() };
const mockReadLoginResult = jest.fn();

jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock("@jitaspace/auth", () => ({
  getOAuthResultCookieName: (secure: boolean) =>
    secure ? "__Host-eve.oauth.result" : "eve.oauth.result",
  readLoginResult: (...args: unknown[]) => mockReadLoginResult(...args),
}));

const loadConsume = () =>
  (require("../app/login/complete/actions") as {
    consumeLoginResult: () => Promise<unknown>;
  }).consumeLoginResult;

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
    expect(mockReadLoginResult).toHaveBeenCalledWith("SEALED");
  });

  it("returns null when the sealed value cannot be unsealed", async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "__Host-eve.oauth.result" ? { value: "TAMPERED" } : undefined,
    );
    mockReadLoginResult.mockRejectedValue(new Error("bad seal"));
    expect(await loadConsume()()).toBeNull();
  });
});
