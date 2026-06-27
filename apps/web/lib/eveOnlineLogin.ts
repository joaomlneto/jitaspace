import posthog from "posthog-js";

/**
 * Start the EVE Online SSO login by navigating to our OAuth initiation
 * endpoint, which generates `state` + PKCE and redirects to the provider.
 *
 * When `returnTo` is omitted, the user is returned to the page they were on
 * when login was initiated. The server (`sanitizeReturnTo`) validates this is a
 * same-site relative path before honouring it.
 */
export function loginWithEveOnline(scopes: string[], returnTo?: string): void {
  const uniqueScopes = [...new Set(scopes)];
  const params = new URLSearchParams();
  params.set("scope", uniqueScopes.join(" "));
  const target =
    returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target) params.set("returnTo", target);
  // The real start of the login funnel: the user clicked log in, before we hand
  // off to EVE SSO. posthog-js sends captures with keepalive, so this survives
  // the navigation below.
  posthog.capture("login_initiated", { scope_count: uniqueScopes.length });
  window.location.assign(`/api/auth/login?${params.toString()}`);
}
