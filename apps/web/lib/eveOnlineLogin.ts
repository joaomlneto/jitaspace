/**
 * Start the EVE Online SSO login by navigating to our OAuth initiation
 * endpoint, which generates `state` + PKCE and redirects to the provider.
 *
 * When `returnTo` is omitted, the user is returned to the page they were on
 * when login was initiated. The server (`sanitizeReturnTo`) validates this is a
 * same-site relative path before honouring it.
 */
export function loginWithEveOnline(scopes: string[], returnTo?: string): void {
  const params = new URLSearchParams();
  params.set("scope", [...new Set(scopes)].join(" "));
  const target =
    returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target) params.set("returnTo", target);
  window.location.assign(`/api/auth/login?${params.toString()}`);
}
