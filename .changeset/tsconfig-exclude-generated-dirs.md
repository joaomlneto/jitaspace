---
"@jitaspace/auth-utils": patch
"@jitaspace/esi-metadata": patch
"@jitaspace/db": patch
---

Align the tsconfig `exclude` list with the rest of the monorepo so `tsc --noEmit` can never pick up generated output. Each package now excludes `node_modules`, `build`, `dist` and `coverage`; previously `build` was missing everywhere and `coverage` was missing from `@jitaspace/db`.

No behaviour change today — these packages already excluded `dist`, so nothing was being mis-checked. This is preventative: `exclude` _replaces_ rather than extends the list inherited from `@jitaspace/tsconfig/base.json` (relative paths in an extended config resolve against the directory of the config that declared them, so the base's entries point at `tooling/tsconfig/` for every consumer). A package that omits an entry therefore silently type-checks that directory the first time something writes to it, which is what happened to `@jitaspace/tiptap-eve`.
