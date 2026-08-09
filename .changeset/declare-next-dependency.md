---
"@jitaspace/ui": patch
"@jitaspace/eve-icons": patch
---

Declare the `next` dependency both packages already import.

`@jitaspace/ui` imports `next/*` in 15 files and `@jitaspace/eve-icons` in one, but neither listed `next` in its manifest. The imports resolved anyway because the workspace uses `nodeLinker: hoisted`, which flattens every dependency into the root `node_modules` — so an undeclared package is indistinguishable from a declared one until that setting changes or the package is consumed outside this repo.

`@jitaspace/eve-components` already declares `next: 16.2.6`, and the version is pinned exactly to match it and `apps/web` so `manypkg` stays happy. Each package declares it in the same section it already uses for React — `dependencies` for `ui`, `devDependencies` for `eve-icons` — rather than changing either package's existing convention.

The lockfile shrinks by ~120 lines: `next` now resolves once with a single peer key instead of several, so the duplicate `next@16.2.6(...)` resolution entries collapse. No functional change.
