---
"@jitaspace/solar-system-map": minor
"@jitaspace/web": patch
---

Add an interactive 3D map to the solar system page. Explore the star, planets, moons, stations and stargates in 3D, positioned from their real in-game coordinates; click any body to smoothly fly the camera to it, and switch between a readable compressed overview (the default), an evenly-spaced rings view, and a true-to-scale realistic view.

Also fixes the solar-system sovereignty avatar, which in systems with no sovereignty holder now shows the star's image instead of a blank placeholder.

The map ships as a new publishable, presentational `@jitaspace/solar-system-map` package (built with React Three Fiber); the web page consumes it through a thin adapter that fetches the ESI/SDE data and resolves names.
