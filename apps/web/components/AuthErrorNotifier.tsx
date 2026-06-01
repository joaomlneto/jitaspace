"use client";

import { useEffect, useRef } from "react";
import { showNotification } from "@mantine/notifications";

/**
 * User-facing copy for the `auth_error` codes the EVE SSO callback can redirect
 * home with (see app/api/auth/callback/eveonline/route.ts). `access_denied` is
 * the provider's code for "user declined consent"; anything else is treated as
 * a genuine failure.
 */
const AUTH_ERROR_COPY: Record<string, { title: string; message: string }> = {
  login_failed: {
    title: "Sign-in failed",
    message: "We couldn't complete your EVE Online sign-in. Please try again.",
  },
  access_denied: {
    title: "Sign-in cancelled",
    message: "You declined the EVE Online authorization request.",
  },
};

const FALLBACK_COPY = {
  title: "Sign-in failed",
  message: "We couldn't complete your EVE Online sign-in. Please try again.",
};

/**
 * Surfaces EVE SSO login failures to the user. On failure the OAuth callback
 * redirects to `/?auth_error=<code>`; this reads that code once on mount, shows
 * a notification, then strips the param from the URL so a refresh or shared
 * link doesn't replay it. Reads `window.location` directly (rather than
 * `useSearchParams`) to remain a purely client-side concern that needs no
 * Suspense boundary.
 */
export const AuthErrorNotifier = () => {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("auth_error");
    if (!code) return;

    handled.current = true;

    const copy = AUTH_ERROR_COPY[code] ?? FALLBACK_COPY;
    showNotification({
      color: code === "access_denied" ? "yellow" : "red",
      title: copy.title,
      message: copy.message,
    });

    url.searchParams.delete("auth_error");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  return null;
};
