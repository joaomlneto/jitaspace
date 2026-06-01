/**
 * Pure, framework-agnostic layout maths for the solar-system map. Kept free of
 * React/three imports so it can be unit-tested in a plain Node environment.
 *
 * Bodies are positioned from their real, system-relative SDE coordinates
 * (metres, with the star at the origin). EVE systems span a huge radial range
 * (inner planet ~0.3 AU, stargates ~38 AU), so the radial distance is remapped
 * per `LayoutMode` while the real angular position (in the orbital x/z plane)
 * is always preserved. Moons and stations are clustered around their parent
 * planet (they sit essentially on it at system scale), so they stay visible.
 */

export type Vec3 = [number, number, number];

export type LayoutMode = "scale" | "compressed" | "rings";

export type HoverKind = "planet" | "moon" | "station" | "stargate";

export interface HoverTarget {
  kind: HoverKind;
  id: number;
  /** Pointer position relative to the canvas, used to place the DOM label. */
  x: number;
  y: number;
}

export interface PlanetInput {
  id: number;
  /** Real, system-relative position (metres). */
  position: Vec3;
  moonIds: number[];
}

export interface BodyInput {
  id: number;
  position: Vec3;
}

// Display constants (the map's own units, not metres).
export const STAR_RADIUS = 1.2;
export const PLANET_BASE_SIZE = 0.42;
const DISPLAY_INNER = 4;
const DISPLAY_OUTER = 22;
const STARGATE_RING = DISPLAY_OUTER * 1.12;

export const PLANET_COLORS = [
  "#7fa8c9",
  "#c79a6b",
  "#a86f52",
  "#6fa890",
  "#9a7fc9",
  "#c9c07f",
  "#7f8fc9",
  "#c97f9a",
  "#7fc9a8",
  "#b98fae",
] as const;

export const STAR_COLOR = "#ffd98a";
export const MOON_COLOR = "#cfd6de";
export const STATION_COLOR = "#5ad0e0";
export const STARGATE_COLOR = "#c98fe0";

export const LAYOUT_MODES: { value: LayoutMode; label: string }[] = [
  { value: "compressed", label: "Compressed" },
  { value: "scale", label: "To scale" },
  { value: "rings", label: "Rings" },
];

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function distanceSq(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/** Deterministic colour for the planet at a given orbital index. */
export function planetColor(index: number): string {
  return PLANET_COLORS[index % PLANET_COLORS.length] ?? PLANET_COLORS[0];
}

/** Id of the planet closest to `position`, or undefined if there are none. */
export function nearestPlanetId(
  position: Vec3,
  planets: PlanetInput[],
): number | undefined {
  let bestId: number | undefined;
  let best = Infinity;
  for (const planet of planets) {
    const d = distanceSq(position, planet.position);
    if (d < best) {
      best = d;
      bestId = planet.id;
    }
  }
  return bestId;
}

/**
 * Map a real distance (metres) to a display radius for the given mode.
 * `rank` is the planet's index when sorted by distance (used by "rings").
 */
export function displayRadius(
  realDistance: number,
  minDistance: number,
  maxDistance: number,
  mode: LayoutMode,
  rank: number,
  planetCount: number,
): number {
  if (mode === "scale") {
    return maxDistance > 0 ? (realDistance / maxDistance) * DISPLAY_OUTER : 0;
  }
  if (mode === "rings") {
    const step = (DISPLAY_OUTER - DISPLAY_INNER) / Math.max(planetCount - 1, 1);
    return DISPLAY_INNER + rank * step;
  }
  // compressed: log map [minDistance, maxDistance] -> [DISPLAY_INNER, DISPLAY_OUTER]
  if (maxDistance <= minDistance || realDistance <= 0) return DISPLAY_INNER;
  const t =
    (Math.log(realDistance) - Math.log(minDistance)) /
    (Math.log(maxDistance) - Math.log(minDistance));
  return DISPLAY_INNER + t * (DISPLAY_OUTER - DISPLAY_INNER);
}

export interface PlacedSatellite {
  id: number;
  kind: "moon" | "station";
  /** Position local to the parent planet. */
  position: Vec3;
}

export interface PlacedPlanet {
  id: number;
  /** Display position (map units). */
  position: Vec3;
  /** Orbit-ring radius. */
  orbitRadius: number;
  size: number;
  color: string;
  satellites: PlacedSatellite[];
}

export interface PlacedStargate {
  id: number;
  position: Vec3;
}

export interface SystemLayout {
  planets: PlacedPlanet[];
  stargates: PlacedStargate[];
  /** Largest display radius in the scene (for framing the camera). */
  extent: number;
}

/** Arrange a planet's moons and stations in small local rings around it. */
function placeSatellites(
  moonIds: number[],
  stationIds: number[],
  planetSize: number,
): PlacedSatellite[] {
  const items: { id: number; kind: "moon" | "station" }[] = [
    ...moonIds.map((id) => ({ id, kind: "moon" as const })),
    ...stationIds.map((id) => ({ id, kind: "station" as const })),
  ];
  return items.map((item, i) => {
    const angle = (i / Math.max(items.length, 1)) * Math.PI * 2;
    const radius = planetSize + 0.4 + (i % 3) * 0.22;
    return {
      ...item,
      position: [
        Math.cos(angle) * radius,
        ((i % 2) - 0.5) * 0.12,
        Math.sin(angle) * radius,
      ],
    };
  });
}

/**
 * Build the full layout from real positions. Planets and stargates keep their
 * real angular position (x/z) with a per-mode radial distance; moons and
 * stations are clustered around their nearest/parent planet.
 */
export function layoutSystem(
  planets: PlanetInput[],
  stations: BodyInput[],
  stargates: BodyInput[],
  mode: LayoutMode,
): SystemLayout {
  const positioned = [...planets, ...stargates];
  const distances = positioned
    .map((b) => length(b.position))
    .filter((d) => d > 0);
  const minDistance = distances.length ? Math.min(...distances) : 1;
  const maxDistance = distances.length ? Math.max(...distances) : 1;

  // Assign each station to its nearest planet.
  const stationsByPlanet = new Map<number, number[]>();
  for (const station of stations) {
    const planetId = nearestPlanetId(station.position, planets);
    if (planetId === undefined) continue;
    const list = stationsByPlanet.get(planetId) ?? [];
    list.push(station.id);
    stationsByPlanet.set(planetId, list);
  }

  // Rank planets by real distance (for "rings" mode).
  const planetRank = new Map<number, number>();
  [...planets]
    .sort((a, b) => length(a.position) - length(b.position))
    .forEach((planet, rank) => planetRank.set(planet.id, rank));

  const placedPlanets: PlacedPlanet[] = planets.map((planet, index) => {
    const realDistance = length(planet.position);
    const rank = planetRank.get(planet.id) ?? index;
    const radius = displayRadius(
      realDistance,
      minDistance,
      maxDistance,
      mode,
      rank,
      planets.length,
    );
    const angle = Math.atan2(planet.position[2], planet.position[0]);
    const size = PLANET_BASE_SIZE + (planet.id % 4) * 0.06;
    return {
      id: planet.id,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      orbitRadius: radius,
      size,
      color: planetColor(index),
      satellites: placeSatellites(
        planet.moonIds,
        stationsByPlanet.get(planet.id) ?? [],
        size,
      ),
    };
  });

  const placedStargates: PlacedStargate[] = stargates.map((gate) => {
    const realDistance = length(gate.position);
    const rank = planets.length;
    const radius =
      mode === "rings"
        ? STARGATE_RING
        : displayRadius(
            realDistance,
            minDistance,
            maxDistance,
            mode,
            rank,
            planets.length,
          );
    const angle = Math.atan2(gate.position[2], gate.position[0]);
    return {
      id: gate.id,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
    };
  });

  const extent = Math.max(
    DISPLAY_INNER,
    ...placedPlanets.map((p) => p.orbitRadius),
    ...placedStargates.map((g) => length(g.position)),
  );

  return { planets: placedPlanets, stargates: placedStargates, extent };
}
