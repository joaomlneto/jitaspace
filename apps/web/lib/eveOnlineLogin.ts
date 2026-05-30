/**
 * Start the EVE Online SSO login by navigating to our OAuth initiation
 * endpoint, which generates `state` + PKCE and redirects to the provider.
 *
 * Replaces next-auth's `signIn("eveonline", ..., { scope })`.
 */
export function loginWithEveOnline(scopes: string[], returnTo?: string): void {
  const params = new URLSearchParams();
  params.set("scope", [...new Set(scopes)].join(" "));
  if (returnTo) params.set("returnTo", returnTo);
  window.location.assign(`/api/auth/login?${params.toString()}`);
}
