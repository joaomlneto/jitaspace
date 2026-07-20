---
"@jitaspace/auth-utils": minor
---

feat(auth-utils): publish @jitaspace/auth-utils as a public npm package

Adds a tsup build step (CJS + ESM + types), removes the private flag, and adds publishConfig/files/repository metadata plus a bundled MIT LICENSE. Declares the previously-undeclared `zod` runtime dependency and drops the unused `next`/`react`/`react-dom` dependencies. Keeps `@jitaspace/esi-metadata` (now also published) for the `ESIScope` type.
