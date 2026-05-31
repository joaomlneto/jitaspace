/**
 * Pure, framework-agnostic layout maths for the schematic solar-system
 * "orrery". Kept free of React/three imports so it can be unit-tested in a
 * plain Node environment.
 */

export interface ScenePlanet {
  planetId: number;
  moonIds: number[];
  beltIds: number[];
}

export type HoverKind = "planet" | "moon" | "station" | "stargate";

export interface HoverTarget {
  kind: HoverKind;
  id: number;
  /** Pointer position relative to the canvas, used to place the DOM label. */
  x: number;
  y: number;
}

// Schematic layout constants (illustrative, not to scale).
export const STAR_RADIUS = 1.4;
export const FIRST_ORBIT = 4.5;
export const ORBIT_STEP = 2.3;
export const PLANET_BASE_SIZE = 0.42;

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

export interface PlanetLayout {
  planet: ScenePlanet;
  /** Orbital radius from the star. */
  orbit: number;
  /** Sphere radius. */
  size: number;
  color: string;
  /** Fixed angle on the orbit (radians) — bodies do not animate. */
  phase: number;
}

export interface SystemLayout {
  planets: PlanetLayout[];
  /** Orbital radius of the outermost planet (or the first orbit if none). */
  outerOrbit: number;
  stationRing: number;
  stargateRing: number;
  /** A camera distance that frames the whole system. */
  camDistance: number;
}

/** Deterministic colour for the planet at a given orbital index. */
export function planetColor(index: number): string {
  return PLANET_COLORS[index % PLANET_COLORS.length] ?? PLANET_COLORS[0];
}

/** Build the full schematic layout for a set of planets. */
export function buildSystemLayout(planets: ScenePlanet[]): SystemLayout {
  const planetLayouts: PlanetLayout[] = planets.map((planet, index) => ({
    planet,
    orbit: FIRST_ORBIT + index * ORBIT_STEP,
    size: PLANET_BASE_SIZE + (planet.planetId % 4) * 0.06,
    color: planetColor(index),
    phase: ((planet.planetId % 360) * Math.PI) / 180,
  }));

  const outerOrbit = planets.length
    ? FIRST_ORBIT + (planets.length - 1) * ORBIT_STEP
    : FIRST_ORBIT;
  const stationRing = outerOrbit + ORBIT_STEP * 0.8;
  const stargateRing = outerOrbit + ORBIT_STEP * 1.55;
  const camDistance = stargateRing * 1.7 + 6;

  return {
    planets: planetLayouts,
    outerOrbit,
    stationRing,
    stargateRing,
    camDistance,
  };
}

/** Fixed orbital radius for the moon at a given index. */
export function moonOrbit(planetSize: number, index: number): number {
  return planetSize + 0.45 + index * 0.32;
}

/** Evenly-spaced angles (radians) for `count` markers around a ring. */
export function ringMarkerAngles(count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => (index / Math.max(count, 1)) * Math.PI * 2,
  );
}

/** World position for the marker at `index` of `count` on a ring of `radius`. */
export function ringMarkerPosition(
  index: number,
  count: number,
  radius: number,
): [number, number, number] {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}
