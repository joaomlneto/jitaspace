// Matches any ASCII control character (\x00–\x1f) or a backslash — inputs that
// browsers normalise cross-origin (e.g. "/\evil.com" resolves to
// "https://evil.com/").
// eslint-disable-next-line no-control-regex -- rejecting control chars is the intent
const UNSAFE_RETURN_TO = /[\x00-\x1f\\]/;

/**
 * Open-redirect guard: only allow same-site relative paths. Rejects absolute
 * URLs, protocol-relative ("//evil.com") paths, and backslash/control-char
 * paths that browsers normalise cross-origin.
 */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !UNSAFE_RETURN_TO.test(value)
  ) {
    return value;
  }
  return "/";
}
