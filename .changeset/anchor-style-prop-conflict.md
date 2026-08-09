---
"@jitaspace/ui": patch
"@jitaspace/eve-components": patch
---

Stop the anchor prop types from rejecting Mantine's `style` prop.

All 25 anchor components declare their props as `AnchorProps & Omit<LinkProps, "href"> & Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size">`. The two halves disagree about `style`: Mantine's is `MantineStyleProp` (which also allows an array of styles, or a function of the theme), while the DOM half is plain `CSSProperties`. Any caller that typed its own props from `AnchorProps` and spread them through therefore failed with TS2322.

The DOM half's `style` is now omitted so the Mantine type wins, which is what these components actually forward to. `CSSProperties` remains assignable, so no existing call site changes.
