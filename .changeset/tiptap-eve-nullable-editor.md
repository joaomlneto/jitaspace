---
"@jitaspace/tiptap-eve": patch
---

`useEveEditor` now returns `Editor | null` instead of `Editor`. With the default
`immediatelyRender: false`, TipTap creates the editor in a post-mount effect, so
it is `null` on the first render. TipTap's `useEditor` only narrows to the
nullable overload for a literal `immediatelyRender: false`; spreading caller
`options` widened it back to the non-null overload, so the returned type lied.
Consumers must now guard `editor?.…` (they already did, but the type no longer
flags those guards as unnecessary).
