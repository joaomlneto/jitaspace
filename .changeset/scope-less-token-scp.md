---
"@jitaspace/auth-utils": patch
"@jitaspace/web": patch
---

Fixed the site search, and every other check of what a character has shared, failing with an error for a character signed in without granting any scopes.

For developers: `getEveSsoAccessTokenPayload` and `verifyEveSsoAccessToken` now always return `scp` as a list, as its type says. EVE writes the claim as a list only when a token grants several scopes: a lone scope is a bare string and a token with none leaves the claim out, so `scp.includes(scope)` matched substrings on the first and threw on the second. The new `normalizeEveSsoScopes` export does the folding. `getEveSsoAccessTokenPayload` also returns `null` for a payload that is valid JSON but not an object, instead of returning that value.
