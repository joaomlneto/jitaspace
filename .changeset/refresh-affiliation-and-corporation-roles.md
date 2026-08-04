---
"@jitaspace/hooks": patch
---

`useAuthStore` now keeps each character's affiliation and corporation roles up to date, and `useAccessToken` enforces the `roles` option instead of documenting it as a no-op.

`CharacterSsoSession.corporationRoles` was initialised empty and never written, so the `roles` option could not be enforced without leaving every role-gated endpoint with no token. `addCharacter` now also reads `GET /characters/{character_id}/roles` (skipped when the token lacks `esi-characters.read_corporation_roles.v1`, which would be a guaranteed 403).

Both affiliation and roles are cached for an hour behind the `affiliationExpiresOn` and `corporationRolesExpireOn` stamps — matching ESI's own cache — and re-read by the new `refreshStaleCharacterData` action, which callers can safely run on a timer: it no-ops without touching the store when nothing is stale, and will not start a second sweep while one is in flight. A failed read keeps the last known value and retries on a shorter delay rather than reporting the character as having no roles. `addCharacter` previously re-read affiliation on every token refresh (roughly every 20 minutes); it now honours the same cache. The undeclared, never-read `affiliationExpirationDate` field it used to write is gone.

`useAccessToken` enforces `roles` exactly as it enforces `scopes`: a character is only eligible if its `corporationRoles` contains every required role. Roles that have never been read are an empty list, so such a character is excluded rather than tried on spec. Reading roles needs `esi-characters.read_corporation_roles.v1`; that scope is not forced on anyone, so a character without it holds no roles as far as this hook is concerned and will not authorise a role-gated request.
