# @jitaspace/solar-system-map

An interactive 3D map of an EVE Online solar system, built with
[React Three Fiber](https://docs.pmnd.rs/react-three-fiber). It draws the star,
its planets (with their moons and stations clustered around each planet) and
stargates, with orbit controls and hover labels.

It is **presentational** — you pass in each body's real, system-relative
position (the metres-scale coordinates from the SDE) and, optionally, a
`renderLabel` callback to resolve names. It has no data-fetching or UI-framework
dependencies of its own.

## Layout modes

EVE systems span a huge radial range (an inner planet sits at ~0.3 AU while
stargates are ~38 AU out), so the **real angular position** of each body is
always preserved while the radial distance is mapped per `LayoutMode`:

- **`compressed`** (default) — log-compressed distance: directions, ordering and
  relative distances are all faithful and everything stays visible.
- **`scale`** — exact linear scale: geometrically accurate, but the inner system
  clusters tightly near the star.
- **`rings`** — planets on evenly-spaced rings (ranked by real distance) at their
  real angles; readable, but radial distances are not to scale.

The map renders a built-in selector to switch between them.

## Usage

```tsx
import { SolarSystemMap } from "@jitaspace/solar-system-map";

<SolarSystemMap
  planets={[
    {
      id: 40000010,
      position: [40e9, 0, 20e9],
      moons: [{ id: 40000011, position: [40e9 + 2e8, 0, 20e9] }],
    },
    { id: 40000020, position: [0, 0, -90e9], moons: [] },
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

| Prop          | Type                                 | Default        | Description                                                          |
| ------------- | ------------------------------------ | -------------- | -------------------------------------------------------------------- |
| `planets`     | `{ id, position, moons }[]`          | —              | Planets with real position (metres); `moons` are `{ id, position }`. |
| `stations`    | `{ id, position }[]`                 | —              | Stations with real position (clustered onto nearest planet).         |
| `stargates`   | `{ id, position }[]`                 | —              | Stargates with real position.                                        |
| `height`      | `number \| string`                   | `460`          | Map height.                                                          |
| `defaultMode` | `"compressed" \| "scale" \| "rings"` | `"compressed"` | Initial layout mode.                                                 |
| `renderLabel` | `({ kind, id }) => ReactNode`        | —              | Renders the hover label; resolve names here.                         |
| `showLegend`  | `boolean`                            | `true`         | Show the colour legend.                                              |
| `autoRotate`  | `boolean`                            | `false`        | Slowly auto-rotate the camera (pauses while hovering).               |

Positions are the raw system-relative SDE coordinates (metres, star at the
origin); the component normalises them for display. Moons and stations sit
essentially on their planet at system scale, so their real position relative to
the planet is preserved (direction and ordering) but amplified into a small
visible band around it.
