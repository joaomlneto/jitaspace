---
"@jitaspace/auth": minor
"@jitaspace/auth-utils": minor
"@jitaspace/hooks": minor
"@jitaspace/web": minor
---

Replace `next-auth` with a self-hosted EVE Online SSO OAuth2 flow (authorization code + PKCE).

The OAuth dance is now handled directly: `/api/auth/login` generates a `state` and a PKCE (S256) challenge and redirects to EVE; `/api/auth/callback/eveonline` verifies `state`, exchanges the code for tokens, and hands them to the client through a single-use cookie consumed at `/login/complete`. `state` and the PKCE verifier live in short-lived, single-use, `httpOnly`/`SameSite=lax` cookies (`Secure` + `__Host-` in production) sealed with `@hapi/iron`.

This removes the single-session limitation of `next-auth` (multiple characters were already tracked in a client-side store) and adds PKCE, which the previous setup did not use. Existing authenticated characters keep working — the sealed refresh-token shape and `NEXTAUTH_SECRET` are unchanged. Logout now clears the character store, and `unsealDataWithAuthSecret` honours its `secret` argument.
