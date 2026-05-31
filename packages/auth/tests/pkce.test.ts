import { createHash } from "crypto";

import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "../src/oauth/pkce";

describe("pkce", () => {
  it("generates a URL-safe, high-entropy code_verifier (>= 43 chars), unique each call", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(generateCodeVerifier()).not.toBe(verifier);
  });

  it("derives an S256 challenge = base64url(sha256(verifier))", () => {
    const verifier = "a-known-verifier";
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(generateCodeChallenge(verifier)).toBe(expected);
    expect(generateCodeChallenge(verifier)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates opaque, unique state values", () => {
    const state = generateState();
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateState()).not.toBe(state);
  });
});
