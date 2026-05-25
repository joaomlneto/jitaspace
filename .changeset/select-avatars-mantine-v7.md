---
"@jitaspace/ui": patch
---

Restore entity avatars in Select components for Mantine v7+

The `itemComponent` prop used in Mantine v6 was removed in v7. `EveEntitySelect`
and `EsiSearchSelect` now use the `renderOption` prop to display entity avatars
on the left side of each dropdown option. `EsiSearchSelect` also renders the
category badge alongside the avatar and name, matching the existing behaviour of
`EsiSearchMultiSelect`.
