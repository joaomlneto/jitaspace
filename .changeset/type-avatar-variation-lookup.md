---
"@jitaspace/ui": patch
"@jitaspace/eve-components": patch
---

Move `TypeAvatar`'s image-variation lookup out of `@jitaspace/ui`.

`@jitaspace/ui` is documented as dependency-light and free of data fetching, but `TypeAvatar` ran an `swr` request against `images.evetech.net/types/<id>` to discover which variations a type offers — and `swr` was never declared as a dependency of the package.

The component is now split along the same display-twin seam as `EveEntityNameDisplay` / `EveEntityName`. `TypeAvatar` in `@jitaspace/ui` renders a variation it is given (defaulting to `"icon"`) and performs no lookup; a new `TypeAvatar` in `@jitaspace/eve-components` owns the `swr` request and delegates to it, and pins a `variation` to skip the request entirely. The fetcher now also checks `response.ok` before parsing, instead of calling `.json()` on an error response.

`apps/web` call sites and `EveEntityAvatar` import `TypeAvatar` from `@jitaspace/eve-components`; the six type-backed wrappers in `@jitaspace/ui` (`StarAvatar`, `StargateAvatar`, `StructureAvatar`, `StationAvatar`, `SolarSystemStarAvatar`, `PlanetAvatar`) all pin a variation and stay on the presentational component. Rendered output is unchanged.

One call site was passing Mantine's `variant="render"` instead of `variation="render"`. Mantine types `variant` as a bare `string`, so the typo type-checked and silently fell through to the lookup; `ItemTypeLinkControl` now asks for the render it intended.
