---
"@jitaspace/eve-icons": patch
"@jitaspace/eve-components": patch
"@jitaspace/ui": patch
---

Declare the static-image module types once instead of once per package.

`@jitaspace/eve-icons` ships TypeScript source, so every consumer compiles its icon modules — and each of those does `import RheaImage from "./rhea.png"`. A standalone `.d.ts` inside eve-icons is never loaded by a consumer's program, so each consumer grew its own copy of the declarations: three hand-written files totalling 155 lines, with a comment asking that they be kept in sync by hand.

They already weren't. `eve-icons` and `eve-components` held byte-identical copies while `@jitaspace/ui`'s had quietly lost its `*.svg` block, and between them they declared five extensions (`svg`, `jpg`, `jpeg`, `webp`, `avif`) that nothing in the monorepo imports.

The reference now lives on `createIconComponent`, the module every icon imports, so the declarations travel with the import graph and reach any consumer without a per-package file. It points at `next/image-types/global` — the same types `apps/web` already references, and the same ones Next injects into a generated `next-env.d.ts` — so there is nothing left to keep in sync. `apps/web` keeps its own reference, which is independently justified: it makes the types available to `tsc` and ESLint before `next build` regenerates that file.

Verified by removing the line: `@jitaspace/ui` goes from 0 to 185 `Cannot find module './*.png'` errors, confirming the single reference is what carries the declarations across the package boundary. No functional change.
