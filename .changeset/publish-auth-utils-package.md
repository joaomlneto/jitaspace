---
"@jitaspace/auth-utils": minor
---

feat(auth-utils): publish @jitaspace/auth-utils as a public npm package

Adds a tsup build step (CJS + ESM + types), removes the private flag, and adds publishConfig/files/repository metadata plus a bundled MIT LICENSE. Declares the previously-undeclared `zod` runtime dependency and drops the unused `next`/`react`/`react-dom` dependencies. Keeps `@jitaspace/esi-metadata` for the `ESIScope` type.

Note `@jitaspace/esi-metadata` must be released in the same batch: `workspace:*` packs as an exact version pin, so publishing `auth-utils` on its own produces a tarball that 404s at install time. Release both via the root `pnpm publish-packages`, then smoke-install the published package — in-repo CI resolves through the workspace symlink and cannot catch this.
