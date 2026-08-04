---
"@jitaspace/hooks": patch
---

`useAccessToken` now honours the `corporationId` and `allianceId` options instead of ignoring them. Corporation- and alliance-scoped ESI routes are authenticated with a character token, so the hook previously returned the first logged-in character holding the required scope — regardless of whether that character was actually a member of the corporation or alliance being queried. It now only considers characters that belong to the requested subject.

Every character that clears the filters can authorise the request equally well, so the first match is used.

The `roles` option remains accepted but unenforced, now documented rather than silently dropped: `CharacterSsoSession.corporationRoles` is initialised empty and never populated, so filtering on it would leave every role-gated endpoint without a token. Call sites keep declaring the roles they need so the check can be enabled in one place once roles are fetched; ESI enforces them server-side meanwhile.
