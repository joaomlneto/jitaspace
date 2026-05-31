# @jitaspace/solar-system-map

An interactive, schematic 3D map ("orrery") of an EVE Online solar system,
built with [React Three Fiber](https://docs.pmnd.rs/react-three-fiber). It
draws the star, its planets (with moons and asteroid belts), stations and
stargates, with orbit controls, gentle auto-rotation and hover labels.

It is **presentational** — you pass in the bodies and (optionally) a
`renderLabel` callback to resolve names. It has no data-fetching or UI-framework
dependencies of its own.

## Usage

```tsx
import { SolarSystemMap } from "@jitaspace/solar-system-map";

<SolarSystemMap
  planets={[
    { planetId: 40000010, moonIds: [40000011, 40000012], beltIds: [40000013] },
    { planetId: 40000020, moonIds: [], beltIds: [] },
  ]}
  stationIds={[60000001, 60000002]}
  stargateIds={[50000001]}
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

| Prop          | Type                               | Default | Description                                  |
| ------------- | ---------------------------------- | ------- | -------------------------------------------- |
| `planets`     | `{ planetId, moonIds, beltIds }[]` | —       | Planets and their moons / asteroid belts.    |
| `stationIds`  | `number[]`                         | —       | Station ids (rendered as markers).           |
| `stargateIds` | `number[]`                         | —       | Stargate ids (rendered as markers).          |
| `height`      | `number \| string`                 | `460`   | Map height.                                  |
| `renderLabel` | `({ kind, id }) => ReactNode`      | —       | Renders the hover label; resolve names here. |
| `showLegend`  | `boolean`                          | `true`  | Show the colour legend.                      |
| `autoRotate`  | `boolean`                          | `true`  | Slowly auto-rotate (pauses while hovering).  |

The layout is illustrative (a schematic orrery), not to physical scale.
