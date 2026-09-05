---
"@jitaspace/ui": patch
---

Stop a caller-supplied `style` from silently dropping `LoginWithEveOnlineButton`'s hover state.

`{...otherProps}` was spread after the computed `style` object, so `<LoginWithEveOnlineButton style={{ width: "100%" }} />` replaced the whole object — losing the layout, the colour-scheme text colour and the hover background that had just been fixed. The same silent-drop failure mode the hover fix existed to remove. Mantine merges an array `style` in order, so the computed object and the caller's are now both applied, caller last.

The button also carries `mantine-focus-auto` now. `UnstyledButton` ships no focus ring of its own, so keyboard users had no affordance at all where pointer users got the hover highlight.
