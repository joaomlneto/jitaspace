---
"@jitaspace/esi-metadata": minor
---

feat(esi-metadata): publish as a public npm package, generated from the ESI spec

- Publishable: tsup build (CJS + ESM + types), removes the private flag, adds publishConfig/files/repository metadata, bundles the MIT LICENSE, and fixes the README to document the actual exports.
- `scopes` and `endpointScopes` are now generated from the EVE Online ESI OpenAPI spec (the same pinned spec that drives the client) via `kubb:generate`, instead of being hand-maintained. This picks up 7 scopes that were missing and drops 1 that CCP removed.
- `ESIScope` is now a forgiving union (`KnownESIScope | (string & {})`): known scopes still autocomplete, but scopes CCP adds later no longer break consumers (notably the `scp` claim decoded from a live token). The closed set is exported as `KnownESIScope`.
- Scope descriptions stay hand-curated in `descriptions.ts` (the spec only echoes the scope name); the generator warns about any scope lacking a description rather than failing.
