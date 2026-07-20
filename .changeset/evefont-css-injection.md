---
"@jitaspace/tiptap-eve": patch
"@jitaspace/web": patch
---

fix(tiptap-eve): harden EveFont against CSS injection from crafted EVE HTML

The `EveFontColor` mark built an inline `style` from attacker-controlled `<font>`
attributes (mail bodies, character bios) without validation, letting a payload
break out of the `color:` / `font-size:` declaration and inject arbitrary CSS
(a full-viewport fixed overlay for clickjacking, plus an external `url(...)`
tracking request on view).

- `fromEveColor` now only ever returns an empty string or a plain hex color.
  The two valid EVE formats still convert (now both require the `0x` prefix),
  plain `#rgb`/`#rrggbb[aa]` passes through, and anything else is rejected. The
  null/empty guard that prevented a prior production crash on color-less
  `<font size="14">` headers is preserved.
- `size` is coerced to a bounded positive number (clamped to 72pt) before use,
  so it can no longer inject CSS.
- Raw `color`/`size` attributes are no longer spread onto the rendered `<span>`;
  the original EVE color string is re-attached only when it passed validation,
  keeping mail composition round-trips lossless.

For `@jitaspace/web`: hardened the rendering of EVE-formatted text (mail and
character bios) so a crafted message can no longer inject page-wide styling or
hidden tracking requests.
