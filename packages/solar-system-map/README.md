# @jitaspace/solar-system-map

An interactive 3D map of an EVE Online solar system, built with
[React Three Fiber](https://docs.pmnd.rs/react-three-fiber). It draws the star,
its planets (with their moons and stations) and stargates, with orbit controls
and hover labels. Clicking a body smoothly centres the camera on it and frames
it by size — handy for diving into the otherwise-tiny inner system.

It is **presentational** — you pass in each body's real, system-relative
position and `radius` (the metres-scale values from the SDE) and, optionally, a
`renderLabel` callback to resolve names. It has no data-fetching or UI-framework
dependencies of its own.

## Layout modes

Every body is placed from its real SDE coordinates and sized from its real
`radius`. EVE systems span an enormous range, though (a planet is ~1/20,000 of
its orbital radius and a moon orbits ~1/46,000 of the system's width from its
planet), so the map offers three modes via a built-in selector:

- **`compressed`** (default) — keeps each body's real angle but log-compresses
  the radial distance so the whole system is legible at a glance; moons/stations
  are clustered around their planet.
- **`realistic`** — every body at its true 3D position (one uniform scale) and
  sized from its real radius. Geometrically faithful, so the system is mostly
  empty space: the star and inner planets sit near the centre and you zoom in to
  inspect them. Sizes are enlarged by a shared factor for visibility (capped so
  the star doesn't engulf the inner planets), keeping them strictly proportional
  to the real radii.
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

> **Note:** the package entry carries `"use client"`, so importing anything from
> `@jitaspace/solar-system-map` — including the pure `layoutSystem` maths from
> `layout.ts` — marks the importing module as client code. A React Server
> Component that only wants the layout functions can't reach them through the
> barrel today; a server-safe `./layout` subpath export can be added if needed.

## Props

| Prop               | Type                                     | Default        | Description                                                                        |
| ------------------ | ---------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `star`             | `{ id, radius }`                         | —              | The system's star, with its real radius (metres).                                  |
| `planets`          | `{ id, position, radius, moons }[]`      | —              | Planets with real position + radius; `moons` are `{ id, position, radius }`.       |
| `stations`         | `{ id, position }[]`                     | —              | Stations with real position (assigned to their nearest planet).                    |
| `stargates`        | `{ id, position }[]`                     | —              | Stargates with real position.                                                      |
| `height`           | `number \| string`                       | `460`          | Map height.                                                                        |
| `defaultMode`      | `"realistic" \| "compressed" \| "rings"` | `"compressed"` | Initial layout mode.                                                               |
| `renderLabel`      | `({ kind, id }) => ReactNode`            | —              | Resolves a body's name, for both the hover label and the text alternative.         |
| `showLegend`       | `boolean`                                | `true`         | Show the colour legend.                                                            |
| `autoRotate`       | `boolean`                                | `false`        | Slowly auto-rotate the camera (pauses while hovering).                             |
| `describeContents` | `boolean`                                | `true`         | Render the visually-hidden text alternative (see [Accessibility](#accessibility)). |
| `style`            | `CSSProperties`                          | —              | Extra styles merged into the map's container element.                              |

Positions and radii are the raw system-relative SDE values (metres, star at the
origin). In `realistic` mode the star, planets and moons are drawn at their
exact positions and at sizes proportional to their real radius (enlarged for
visibility); stations and stargates have no radius and render as fixed icons.
Because moons orbit so close to their planet, at system scale they sit
essentially on (or inside) the planet — zoom in to separate them.

## Accessibility

A `<canvas>` is opaque to assistive technology, so alongside it the map renders
a **text alternative**: a nested, visually-hidden list of every body it draws —
the star, each planet with its own moons and stations, any station with no
planet to attach to, and the stargates. Names come from `renderLabel`, the same
callback the hover label uses, so pass one to get real names rather than the
`Planet 40000010` fallback.

It is hidden with the usual clip technique (a 1x1 clipped box) rather than
`display: none` or `hidden`, which would drop it from the accessibility tree
too. It costs no pixels, is read-only, and can be turned off with
`describeContents={false}` — do that only when the host page already lists the
same bodies accessibly, since otherwise the map has nothing to say to a screen
reader.

The map itself also exposes a named `region` landmark and a labelled `group` of
layout-mode buttons. The 3D bodies are still **pointer-only** to interact with:
hovering for a name and clicking to focus the camera have no keyboard
equivalent yet, and the overlay hint describing those gestures is
`aria-hidden`.
