/**
 * The scopes a character's token holds, always as a list.
 *
 * `accessTokenPayload.scp` is typed `ESIScope[]`, but EVE SSO writes a token
 * with a single scope as a plain string. Spreading that string to re-request
 * the character's scopes would send its letters, one scope each, and SSO would
 * reject the login.
 */
export function grantedScopesOf(
  scp: readonly string[] | string | undefined,
): string[] {
  if (scp === undefined) return [];
  return typeof scp === "string" ? [scp] : [...scp];
}
