"use server";

import { cookies } from "next/headers";

import type { LoginResult } from "@jitaspace/auth";
import { getOAuthResultCookieName, readLoginResult } from "@jitaspace/auth";

/**
 * Drains the single-use, httpOnly login-result cookie set by the OAuth callback
 * and returns the freshly-minted tokens to the client so they can be added to
 * the (client-side) auth store. The cookie is always cleared.
 */
export async function consumeLoginResult(): Promise<LoginResult | null> {
  const cookieStore = await cookies();

  // The cookie name depends on whether the request was secure; try both so we
  // don't need to reconstruct the request scheme here.
  const secureName = getOAuthResultCookieName(true);
  const plainName = getOAuthResultCookieName(false);
  const sealed =
    cookieStore.get(secureName)?.value ?? cookieStore.get(plainName)?.value;

  cookieStore.delete(secureName);
  cookieStore.delete(plainName);

  if (!sealed) return null;

  try {
    return await readLoginResult(sealed);
  } catch {
    return null;
  }
}
