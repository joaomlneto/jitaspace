---
"@jitaspace/tiptap-eve": patch
"@jitaspace/web": patch
---

fix(tiptap-eve): decode EVE's `#AARRGGBB` colors and stop pinning body text to white

`fromEveColor` passed any 8-digit `#` hex straight through to CSS. EVE writes
colors alpha-FIRST, so CSS read them as `#RRGGBBAA` and scrambled the hue — the
real PLEX description's `#ff3399cc` (opaque EVE blue `#3399cc`) rendered as
80%-opacity hot pink.

- 8-digit `#` values are now decoded as EVE ARGB, matching the existing `0x`
  branches. The alpha byte is dropped rather than translated: EVE uses it to dim
  text against the client's near-black UI, and compositing it against a web
  background only pushes already-pale text further toward invisible.
- Pass-through is narrowed to valid CSS hex lengths (3 and 6 digits). 5- and
  7-digit values previously slipped through and the browser silently dropped the
  declaration.
- A decoded near-white color (EVE's `#bfffffff` body text) no longer emits a
  `color` declaration at all, so the text inherits the theme's foreground. The
  original EVE color string is still kept on the span, so mail composition
  round-trips losslessly.

For `@jitaspace/web`: fixed colored text in mail, character bios and item
descriptions. Some colors were rendered as the wrong hue entirely, and EVE's
standard body-text color came out white — invisible on the light theme.
