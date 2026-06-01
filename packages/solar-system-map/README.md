# @jitaspace/solar-system-map

An interactive 3D map of an EVE Online solar system, built with
[React Three Fiber](https://docs.pmnd.rs/react-three-fiber). It draws the star,
its planets (with their moons and stations) and stargates, with orbit controls
and hover labels.

It is **presentational** — you pass in each body's real, system-relative
position and `radius` (the metres-scale values from the SDE) and, optionally, a
`renderLabel` callback to resolve names. It has no data-fetching or UI-framework
dependencies of its own.

## Layout modes

Every body is placed from its real SDE coordinates and sized from its real
`radius`. EVE systems span an enormous range, though (a planet is ~1/20,000 of
its orbital radius and a moon orbits ~1/46,000 of the system's width from its
planet), so the map offers three modes via a built-in selector:

- **`realistic`** (default) — every body at its true 3D position (one uniform
  scale) and sized from its real radius. Geometrically faithful, so the system
  is mostly empty space: the star and inner planets sit near the centre and you
  zoom in to inspect them. Sizes are enlarged by a shared factor for visibility
  (capped so the star doesn't engulf the inner planets), keeping them strictly
  proportional to the real radii.
- **`compressed`** — keeps each body's real angle but log-compresses the radial
  distance so the whole system is legible at a glance; moons/stations are
  clustered around their planet.
- **`rings`** — planets on evenly-spaced rings (ranked by real distance) at their
  real angles.

## Usage

```tsx
import { SolarSystemMap } from "@jitaspace/solar-system-map";

<SolarSystemMap
  star={{ id: 40000009, radius: 5.1e8 }}
  planets={[
    {
      id: 40000010,
      position: [40e9, 0, 20e9],
      radius: 6e6,
      moons: [{ id: 40000011, position: [40e9 + 2e8, 0, 20e9], radius: 2e5 }],
    },
    { id: 40000020, position: [0, 0, -90e9], radius: 5e7, moons: [] },
  ]}
  stations={[{ id: 60000001, position: [41e9, 1e9, 20e9] }]}
  stargates={[{ id: 50000001, position: [0, 0, -4000e9] }]}
  renderLabel={({ kind, id }) => `${kind} ${id}`}
/>;
```

The component renders a WebGL `<canvas>` and cannot be server-rendered. In
Next.js, load it lazily:

```tsx
const SolarSystemMap = dynamic(
  () => import("@jitaspace/solar-system-map").then((m) => m.SolarSystemMap),
  { ssr: false },
);
```

## Props

| Prop          | Type                                     | Default       | Description                                                                  |
| ------------- | ---------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `star`        | `{ id, radius }`                         | —             | The system's star, with its real radius (metres).                            |
| `planets`     | `{ id, position, radius, moons }[]`      | —             | Planets with real position + radius; `moons` are `{ id, position, radius }`. |
| `stations`    | `{ id, position }[]`                     | —             | Stations with real position (assigned to their nearest planet).              |
| `stargates`   | `{ id, position }[]`                     | —             | Stargates with real position.                                                |
| `height`      | `number \| string`                       | `460`         | Map height.                                                                  |
| `defaultMode` | `"realistic" \| "compressed" \| "rings"` | `"realistic"` | Initial layout mode.                                                         |
| `renderLabel` | `({ kind, id }) => ReactNode`            | —             | Renders the hover label; resolve names here. `kind` includes `"star"`.       |
| `showLegend`  | `boolean`                                | `true`        | Show the colour legend.                                                      |
| `autoRotate`  | `boolean`                                | `false`       | Slowly auto-rotate the camera (pauses while hovering).                       |

Positions and radii are the raw system-relative SDE values (metres, star at the
origin). In `realistic` mode the star, planets and moons are drawn at their
exact positions and at sizes proportional to their real radius (enlarged for
visibility); stations and stargates have no radius and render as fixed icons.
Because moons orbit so close to their planet, at system scale they sit
essentially on (or inside) the planet — zoom in to separate them.
