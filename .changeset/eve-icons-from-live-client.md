---
"@jitaspace/eve-icons": minor
---

Rebuilt the package from the live EVE client: 875 UI icons in 20 sets (window icons, the client's modern glyph library, faction logos, killmarks, masteries, ship-tree glyphs, crimewatch, and more), each a generated `<Set><Name>Icon` component with its artwork inlined as data URIs, so the package no longer needs `next/image` or a bundler that understands image imports. Components take `size`, `width`/`height`, `fill`, and `color`, which tints single-colour glyphs. `EVE_ICONS` and `EVE_ICON_SETS` list every icon without loading artwork. The previous component names (`CalendarIcon`, `WalletIcon`, …) remain as aliases.

Breaking: `EveIconsContextProvider`, `useEveIconsConfig`, `ICON_VERSIONS` and the `variant` prop are gone; the old castor/incarna/rhea artwork was replaced by the current client's. The package is now publishable. The code stays MIT, but the artwork is © CCP hf. (Fenris Creations) and is not: see the package's LICENSE.
