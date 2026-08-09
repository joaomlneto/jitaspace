---
"@jitaspace/tiptap-eve": patch
---

Stop `tsc --noEmit` from type-checking the package's own `dist/` bundle. The tsconfig declared `"exclude": ["node_modules"]`, which _replaces_ rather than extends the list inherited from `@jitaspace/tsconfig/base.json`. Combined with `"include": ["."]` and `checkJs`, that meant every `tsup` build left the gitignored bundle in the program and `pnpm type-check` reported ~1900 phantom errors in generated output. The exclude now lists the generated directories explicitly.

Note that an inherited `exclude` can never fix this: relative paths in an extended config resolve against the directory of the config that declared them, so the base's entries point at `tooling/tsconfig/` for every consumer. Each package has to spell out its own list.
