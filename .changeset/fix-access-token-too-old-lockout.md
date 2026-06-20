---
"@jitaspace/hooks": patch
"@jitaspace/web": patch
---

Fix being incorrectly signed out with an "access token is too old" error even when you had used the app within the last month. Two issues combined to lock characters out: a successful token refresh was silently discarded whenever the background character-affiliation lookup happened to fail (which also threw away the rotated refresh token and froze the "last refreshed" timestamp), and once the stored session did cross the 30-day threshold the failure was only logged to the console, so the app kept silently retrying forever instead of asking you to sign in again. Affiliation enrichment is now best-effort and never blocks the token update, and a session EVE can no longer renew now cleanly drops that character and prompts re-authentication.
