---
"@jitaspace/auth-utils": patch
"@jitaspace/esi-metadata": patch
"@jitaspace/tiptap-eve": patch
"@jitaspace/db": patch
---

build: run the publishable packages' build on `prepack`, not `prepublishOnly`

`prepublishOnly` does not run for `pack`, and `dist/` is gitignored — so in a
fresh clone `pnpm pack` silently produced a tarball containing only
`package.json`, `README.md` and `LICENSE`, with no code, while its manifest
still advertised `main: ./dist/index.cjs`. Nothing warned at any step.

`prepack` runs for `pnpm pack`, `npm pack` and `pnpm publish` alike, so packing
and publishing now both build first. (Keeping both hooks would build twice on
publish, so this replaces rather than adds.)
