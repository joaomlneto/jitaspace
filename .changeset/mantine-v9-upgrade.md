---
"@jitaspace/web": patch
"@jitaspace/ui": patch
"@jitaspace/tiptap-eve": patch
---

Upgrade Mantine from v8 to v9 (`@mantine/* 9.3.0`), which also requires TipTap v2 → v3 (`@tiptap/* 3.x`, the peer of `@mantine/tiptap@9`). Adapts the documented breaking changes (`Text`/`Anchor` `color` → `c`, `TypographyStylesProvider` → `Typography`, `Collapse` `in` → `expanded`) plus two undocumented ones (`useHeadroom` now returns `{ pinned }`; `Select`'s input role is now `combobox`). For TipTap v3, `TextStyle` becomes a named import and StarterKit's newly-bundled Link/Underline/HardBreak are disabled so they don't collide with the customized EVE extensions. The v8 look and feel is preserved via `v8CssVariablesResolver` (light variant), `defaultRadius: "sm"`, and `pauseResetOnHover="notification"`.
