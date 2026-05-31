import { createHash, randomBytes } from "node:crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/**
 * RFC 7636 `code_verifier`: a high-entropy, 43-128 character URL-safe string.
 * 32 random bytes base64url-encode to 43 characters.
 */
export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

/**
 * RFC 7636 S256 `code_challenge` = BASE64URL(SHA256(code_verifier)).
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
}

/**
 * RFC 6749 §10.12 `state`: an opaque, unguessable value used to bind the
 * authorization request to the callback and prevent CSRF / code injection.
 */
export function generateState(): string {
  return base64UrlEncode(randomBytes(32));
}
