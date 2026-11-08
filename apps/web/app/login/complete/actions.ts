"use server";

import { cookies } from "next/headers";

import type { LoginResult } from "@jitaspace/auth";
import {
  getOAuthResultCookieName,
  joinCookieChunks,
  readLoginResult,
} from "@jitaspace/auth";

import { env } from "~/env";

/**
 * Drains the single-use, httpOnly login-result cookie set by the OAuth callback
 * and returns the freshly-minted tokens to the client so they can be added to
 * the (client-side) auth store. The cookie is always cleared.
 *
 * The callback splits the sealed result across numbered chunk cookies
 * (`<name>.0`, `<name>.1`, …), since it outgrows one cookie; they are joined
 * back here.
 */
export async function consumeLoginResult(): Promise<LoginResult | null> {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  // The cookie name depends on whether the request was secure; try both so we
  // don't need to reconstruct the request scheme here.
  const secure = joinCookieChunks(all, getOAuthResultCookieName(true));
  const plain = joinCookieChunks(all, getOAuthResultCookieName(false));
  const sealed = secure.value ?? plain.value;

  // Expire with the attributes the cookies were set with: a browser ignores a
  // `__Host-` cookie written without `Secure`, deletion included.
  for (const name of secure.names) {
    cookieStore.set(name, "", { path: "/", secure: true, maxAge: 0 });
  }
  for (const name of plain.names) {
    cookieStore.set(name, "", { path: "/", maxAge: 0 });
  }

  if (!sealed) return null;

  try {
    return await readLoginResult(sealed, {
      nextAuthSecret: env.NEXTAUTH_SECRET,
    });
  } catch {
    return null;
  }
}
