---
"@jitaspace/utils": patch
"@jitaspace/ui": patch
"@jitaspace/eve-components": patch
---

Read numeric and CSS-length avatar sizes as pixels in `getAvatarSize`.

Mantine's `size` prop accepts a named size (`"md"`), a raw pixel number (`64`) or a CSS length (`"1rem"`). `getAvatarSize` only handled the first: it looked `size` up as a key in the named-size map, and anything absent fell through to the `1024` default. Every numeric and `rem` size in the app therefore resolved to 1024 — 39 numeric call sites and 5 `"1rem"` ones.

That number is not cosmetic. `EveImageServerAvatar` feeds it to `esiImageSizeClamp` to choose the resolution it requests from the EVE image server, so `<CharacterAvatar size={20} />` asked for a 1024x1024 portrait. `EveEntityAvatar` and `EveMailSenderAvatar` feed it to the `width`/`height` of their fallback SVG icons, so the same prop drew a 1024px icon where a 24px one was wanted.

`getAvatarSize` now returns a number size directly, parses `px`/`rem`/`em`/unitless length strings, and keeps the `1024` fallback only for values it genuinely cannot read. Non-positive sizes fall back to the default rather than producing `NaN` downstream.

Two existing tests asserted the old behaviour and were rewritten: a numeric size no longer resolves through a string-coerced key lookup (`{ 32: 500 }` with `size={32}` now yields `32`, not `500`), since Mantine's numeric size means pixels.
