---
"@jitaspace/solar-system-map": minor
"@jitaspace/web": patch
---

Add `@jitaspace/solar-system-map`, a publishable React Three Fiber package that renders an interactive 3D map of a solar system — the star, planets (with their moons and stations clustered around each planet) and stargates — from the celestials' real, system-relative SDE positions, with orbit controls and hover labels. Bodies keep their real angular position while the radial distance is mapped per a selectable layout mode (compressed / to-scale / rings). It is presentational (props-driven, with a `renderLabel` hook) and has no data-fetching dependencies. The web solar-system page consumes it through a thin adapter that fetches ESI/SDE data and supplies name-resolving labels.
