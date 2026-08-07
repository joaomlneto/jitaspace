---
"@jitaspace/tiptap-eve": patch
"@jitaspace/eve-data": patch
---

Stop type-checking the packages' own build output.

`@jitaspace/tiptap-eve` reported 1,907 errors inside its `dist/index.js`: a package-level `exclude` replaces the inherited array rather than merging with it, so dropping `dist` from the local list re-exposed the tsup bundle to the base config's `checkJs`. `dist` is restored there and in `@jitaspace/eve-data`, the other package that emits one. No functional change.
