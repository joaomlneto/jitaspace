---
"@jitaspace/tsconfig": patch
"@jitaspace/auth": patch
"@jitaspace/background-jobs": patch
"@jitaspace/chat": patch
"@jitaspace/eve-components": patch
"@jitaspace/eve-data": patch
"@jitaspace/eve-icons": patch
"@jitaspace/hooks": patch
"@jitaspace/sde-utils": patch
"@jitaspace/tiptap-eve": patch
"@jitaspace/ui": patch
"@jitaspace/utils": patch
---

Exclude Jest's `coverage/` output from TypeScript compilation. The base config enables `checkJs`, so after `pnpm test` wrote a coverage directory, `tsc` type-checked Istanbul's generated HTML reporter assets (`coverage/lcov-report/block-navigation.js`, `prettify.js`, `sorter.js`) and reported ~167 errors per affected package.

`coverage` is now excluded in `@jitaspace/tsconfig/base.json` so new packages inherit it. Because a package-level `exclude` replaces the inherited array rather than merging with it, `coverage` was also added to each package that overrides `exclude` and writes coverage. No functional change.
