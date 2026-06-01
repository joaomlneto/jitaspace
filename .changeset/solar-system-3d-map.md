---
"@jitaspace/solar-system-map": minor
"@jitaspace/web": patch
---

Add `@jitaspace/solar-system-map`, a publishable React Three Fiber package that renders an interactive 3D map of a solar system — the star, planets (with their moons and stations) and stargates — from the celestials' real, system-relative SDE positions, with orbit controls and hover labels. Planets and stargates keep their real angular position while the radial distance is mapped per a selectable layout mode (compressed / to-scale / rings); moons and stations are placed from their real position relative to their parent planet (direction preserved, distance amplified into a small visible band, since at system scale they sit essentially on the planet). It is presentational (props-driven, with a `renderLabel` hook) and has no data-fetching dependencies. The web solar-system page consumes it through a thin adapter that fetches ESI/SDE data and supplies name-resolving labels.
