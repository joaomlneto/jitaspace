---
"@jitaspace/ui": patch
---

Make `@jitaspace/ui`'s manifest describe what the package actually imports.

Sixteen dependencies were declared and never imported: `@mantine/carousel`, `@mantine/dates`, `@mantine/dropzone`, `@mantine/form`, `@mantine/notifications`, `@mantine/nprogress`, `@mantine/spotlight`, `@mantine/tiptap`, `embla-carousel-react`, and the seven `@tiptap/*` packages. They are removed — the README's claim that the package depends on "the Mantine/Tiptap UI ecosystem" was never true of the code.

`humanize-duration` went the other way: `HumanDurationText` imports it, but only `@types/humanize-duration` was declared. It resolved anyway because the workspace uses `nodeLinker: hoisted`, so the root `node_modules` satisfied it — nothing in lint, type-check, build or `manypkg check` catches a missing runtime dependency under that layout. It is now declared.
