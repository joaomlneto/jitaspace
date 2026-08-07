---
"@jitaspace/tiptap-eve": patch
"@jitaspace/eve-data": patch
---

Make `@jitaspace/tiptap-eve` and `@jitaspace/eve-data` type-check clean.

Both packages set `"exclude": ["node_modules"]` in their `tsconfig.json`, which replaces the parent `exclude` from `@jitaspace/tsconfig/base.json` rather than merging with it. With `"include": ["."]`, `tsc --noEmit` therefore walked each package's own build output and Jest coverage report instead of just its source.

`@jitaspace/tiptap-eve` reported 2076 errors — 1909 in `dist/`, 167 in `coverage/lcov-report/`, none in source. `@jitaspace/eve-data` reported 167, all in `coverage/lcov-report/`; its `dist/` was walked too but happened to be error-free.

The exclude is now `["node_modules", "dist", "coverage"]` in both, matching the other packages in the repo. Source, tests and configs are still checked; no change to emitted output.
