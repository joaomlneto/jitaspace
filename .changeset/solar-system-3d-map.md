---
"@jitaspace/solar-system-map": minor
"@jitaspace/web": patch
---

Add `@jitaspace/solar-system-map`, a publishable React Three Fiber package that renders an interactive 3D map of a solar system — the star, planets (with their moons and stations) and stargates — from the celestials' real, system-relative SDE coordinates, with orbit controls, hover labels, and click-to-focus (clicking a body smoothly centres the camera on it). The default `realistic` mode places every body (including moons) at its true 3D position on a single uniform scale and sizes the star, planets and moons from their real SDE `radius` (enlarged by a shared factor for visibility, capped so the star doesn't engulf the inner planets); the hoverable star sits at the origin. Two overview modes (`compressed`, `rings`) keep each body's real angle but remap the radial distance for legibility. It is presentational (props-driven, with a `renderLabel` hook) and has no data-fetching dependencies. The web solar-system page consumes it through a thin adapter that fetches ESI/SDE data and supplies name-resolving labels.
