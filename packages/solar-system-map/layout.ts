/**
 * Pure, framework-agnostic layout maths for the solar-system map. Kept free of
 * React/three imports so it can be unit-tested in a plain Node environment.
 *
 * Every body is positioned from its real, system-relative SDE coordinates
 * (metres, with the star at the origin) and sized from its real SDE `radius`.
 *
 * EVE systems span an enormous range — a planet is ~1/20,000 of its orbital
 * radius and a moon orbits ~1/46,000 of the system's width from its planet — so
 * a single uniform scale (the "realistic" mode) is geometrically exact but
 * leaves most bodies very small; two readable "overview" modes (compressed,
 * rings) remap the radial distance for legibility while keeping each body's real
 * angular position. Sizes stay proportional to the real radius in every mode.
 */

export type Vec3 = [number, number, number];

export type LayoutMode = "realistic" | "compressed" | "rings";

export type HoverKind = "star" | "planet" | "moon" | "station" | "stargate";

export interface HoverTarget {
  kind: HoverKind;
  id: number;
  /** Pointer position relative to the canvas, used to place the DOM label. */
  x: number;
  y: number;
}

export interface StarInput {
  id: number;
  /** Real radius (metres). */
  radius: number;
}

export interface PlanetInput {
  id: number;
  /** Real, system-relative position (metres). */
  position: Vec3;
  /** Real radius (metres). */
  radius: number;
  /** This planet's moons with their real position and radius. */
  moons: BodyInput[];
}

export interface BodyInput {
  id: number;
  /** Real, system-relative position (metres). */
  position: Vec3;
  /** Real radius (metres); present for moons, absent for stations/stargates. */
  radius?: number;
}

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
  { value: "realistic", label: "Realistic" },
  { value: "compressed", label: "Compressed" },
  { value: "rings", label: "Rings" },
];

// --- Overview-mode display constants (map units, not metres) ---
const DISPLAY_INNER = 4;
const DISPLAY_OUTER = 22;
const STARGATE_RING = DISPLAY_OUTER * 1.12;
const OVERVIEW_MAX_PLANET_SIZE = 0.55;
const OVERVIEW_MIN_PLANET_SIZE = 0.12;
const OVERVIEW_STAR_SIZE = 1.2;
const OVERVIEW_MOON_SIZE = 0.09;
// Small local cluster band for moons/stations in the overview modes.
const SAT_INNER_GAP = 0.4;
const SAT_BAND = 1.1;

// --- Realistic-mode constants ---
/** The outermost body is mapped to this many display units. */
const REALISTIC_EXTENT = 26;
/** Sizes are exaggerated by this factor over true scale (so bodies are visible)… */
const SIZE_EXAGGERATION = 60;
/** …but capped so the star never grows past this fraction of the innermost orbit. */
const STAR_SWALLOW_FRACTION = 0.6;
/** Smallest geometry we will emit, to avoid degenerate zero-size meshes. */
const MIN_GEOMETRY = 1e-4;

// Fixed icon sizes for radius-less bodies (stations, stargates).
const STATION_ICON = 0.05;
const STARGATE_ICON = 0.07;

// Camera framing when a body is selected (clicked) to centre on it.
const FOCUS_SIZE_MULT = 8;
const MIN_FOCUS_DISTANCE = 0.25;

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
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
 * Map a real distance (metres) to a display radius for an overview mode.
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

/**
 * Camera distance that nicely frames a body of the given display `size` when it
 * is selected: proportional to the body so big bodies are viewed from farther
 * away, floored so tiny bodies don't pull the camera inside them, and capped at
 * the scene `extent` so it never zooms out past the whole system.
 */
export function focusDistance(size: number, extent: number): number {
  return Math.min(Math.max(size * FOCUS_SIZE_MULT, MIN_FOCUS_DISTANCE), extent);
}

export interface PlacedStar {
  id: number;
  size: number;
}

export interface PlacedSatellite {
  id: number;
  kind: "moon" | "station";
  /** Position local to the parent planet. */
  position: Vec3;
  size: number;
}

export interface PlacedPlanet {
  id: number;
  /** Display position (map units). */
  position: Vec3;
  /** Orbit-ring radius (overview modes only). */
  orbitRadius: number;
  size: number;
  color: string;
  satellites: PlacedSatellite[];
}

export interface PlacedStargate {
  id: number;
  position: Vec3;
  size: number;
}

export interface SystemLayout {
  star: PlacedStar;
  planets: PlacedPlanet[];
  stargates: PlacedStargate[];
  /** Largest display radius in the scene (for framing the camera). */
  extent: number;
  /** Whether bodies sit on flat orbit rings (overview) or in real 3D (realistic). */
  flat: boolean;
}

/** Assign each station to its nearest planet. */
function groupStationsByPlanet(
  stations: BodyInput[],
  planets: PlanetInput[],
): Map<number, BodyInput[]> {
  const byPlanet = new Map<number, BodyInput[]>();
  for (const station of stations) {
    const planetId = nearestPlanetId(station.position, planets);
    if (planetId === undefined) continue;
    const list = byPlanet.get(planetId) ?? [];
    list.push(station);
    byPlanet.set(planetId, list);
  }
  return byPlanet;
}

/** Even fan direction, used when a satellite sits exactly on the planet. */
function fanDirection(i: number, count: number): Vec3 {
  const angle = (i / Math.max(count, 1)) * Math.PI * 2;
  return [Math.cos(angle), 0, Math.sin(angle)];
}

/**
 * Cluster a planet's moons and stations into a small visible band around it for
 * the overview modes. The real direction (from the real offset) is preserved;
 * the real distance is normalised into the band so ordering stays faithful.
 */
function placeSatellitesOverview(
  moons: BodyInput[],
  stations: BodyInput[],
  planetPosition: Vec3,
  planetSize: number,
): PlacedSatellite[] {
  const raw: {
    id: number;
    kind: "moon" | "station";
    offset: Vec3;
    size: number;
  }[] = [
    ...moons.map((m) => ({
      id: m.id,
      kind: "moon" as const,
      offset: subtract(m.position, planetPosition),
      size: OVERVIEW_MOON_SIZE,
    })),
    ...stations.map((s) => ({
      id: s.id,
      kind: "station" as const,
      offset: subtract(s.position, planetPosition),
      size: STATION_ICON,
    })),
  ];
  if (raw.length === 0) return [];

  const items = raw.map((it) => ({ ...it, dist: length(it.offset) }));
  const dists = items.map((it) => it.dist);
  const minDist = Math.min(...dists);
  const maxDist = Math.max(...dists);
  const inner = planetSize + SAT_INNER_GAP;

  return items.map((item, i) => {
    const t =
      maxDist > minDist ? (item.dist - minDist) / (maxDist - minDist) : 0;
    const radius = inner + t * SAT_BAND;
    const dir: Vec3 =
      item.dist > 0
        ? scaleVec(item.offset, 1 / item.dist)
        : fanDirection(i, items.length);
    return {
      id: item.id,
      kind: item.kind,
      position: [dir[0] * radius, dir[1] * radius, dir[2] * radius],
      size: item.size,
    };
  });
}

/**
 * Realistic layout: every body at its true 3D position (uniform scale) and
 * sized from its real radius (enlarged by a shared factor so bodies are
 * visible, capped so the star does not swallow the innermost planet). Moons and
 * stations are placed at their exact position relative to the parent planet.
 */
function layoutRealistic(
  star: StarInput,
  planets: PlanetInput[],
  stations: BodyInput[],
  stargates: BodyInput[],
): SystemLayout {
  const bodyDistances = [...planets, ...stargates, ...stations]
    .map((b) => length(b.position))
    .filter((d) => d > 0);
  const maxDist = bodyDistances.length ? Math.max(...bodyDistances) : 1;
  const posScale = REALISTIC_EXTENT / maxDist;

  const planetDistances = planets
    .map((p) => length(p.position))
    .filter((d) => d > 0);
  const minPlanetDist = planetDistances.length
    ? Math.min(...planetDistances)
    : maxDist;

  // Exaggerate sizes for visibility, but cap so the star stays inside the
  // innermost orbit rather than engulfing the inner planets.
  const swallowCap =
    star.radius > 0
      ? (STAR_SWALLOW_FRACTION * minPlanetDist * posScale) / star.radius
      : Infinity;
  const sizeScale = Math.min(SIZE_EXAGGERATION * posScale, swallowCap);
  const sizeOf = (radius: number | undefined) =>
    Math.max(MIN_GEOMETRY, (radius ?? 0) * sizeScale);

  const stationsByPlanet = groupStationsByPlanet(stations, planets);

  const placedPlanets: PlacedPlanet[] = planets.map((planet, index) => {
    const position = scaleVec(planet.position, posScale);
    const satellites: PlacedSatellite[] = [
      ...planet.moons.map((m) => ({
        id: m.id,
        kind: "moon" as const,
        position: scaleVec(subtract(m.position, planet.position), posScale),
        size: sizeOf(m.radius),
      })),
      ...(stationsByPlanet.get(planet.id) ?? []).map((s) => ({
        id: s.id,
        kind: "station" as const,
        position: scaleVec(subtract(s.position, planet.position), posScale),
        size: STATION_ICON,
      })),
    ];
    return {
      id: planet.id,
      position,
      orbitRadius: length(position),
      size: sizeOf(planet.radius),
      color: planetColor(index),
      satellites,
    };
  });

  const placedStargates: PlacedStargate[] = stargates.map((gate) => ({
    id: gate.id,
    position: scaleVec(gate.position, posScale),
    size: STARGATE_ICON,
  }));

  const extent = Math.max(
    REALISTIC_EXTENT,
    ...placedPlanets.map((p) => p.orbitRadius),
    ...placedStargates.map((g) => length(g.position)),
  );

  return {
    star: { id: star.id, size: sizeOf(star.radius) },
    planets: placedPlanets,
    stargates: placedStargates,
    extent,
    flat: false,
  };
}

/**
 * Overview layout (compressed / rings): each body keeps its real angular
 * position but the radial distance is remapped onto a readable spread; planets
 * are sized proportionally to their real radius and moons/stations are
 * clustered around their planet.
 */
function layoutOverview(
  star: StarInput,
  planets: PlanetInput[],
  stations: BodyInput[],
  stargates: BodyInput[],
  mode: LayoutMode,
): SystemLayout {
  const distances = [...planets, ...stargates]
    .map((b) => length(b.position))
    .filter((d) => d > 0);
  const minDistance = distances.length ? Math.min(...distances) : 1;
  const maxDistance = distances.length ? Math.max(...distances) : 1;

  const maxPlanetRadius = planets.length
    ? Math.max(...planets.map((p) => p.radius))
    : 1;
  const planetSizeScale =
    maxPlanetRadius > 0 ? OVERVIEW_MAX_PLANET_SIZE / maxPlanetRadius : 0;
  const planetSizeOf = (radius: number) =>
    Math.max(OVERVIEW_MIN_PLANET_SIZE, radius * planetSizeScale);

  const stationsByPlanet = groupStationsByPlanet(stations, planets);

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
    const size = planetSizeOf(planet.radius);
    return {
      id: planet.id,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      orbitRadius: radius,
      size,
      color: planetColor(index),
      satellites: placeSatellitesOverview(
        planet.moons,
        stationsByPlanet.get(planet.id) ?? [],
        planet.position,
        size,
      ),
    };
  });

  const placedStargates: PlacedStargate[] = stargates.map((gate) => {
    const realDistance = length(gate.position);
    const radius =
      mode === "rings"
        ? STARGATE_RING
        : displayRadius(
            realDistance,
            minDistance,
            maxDistance,
            mode,
            planets.length,
            planets.length,
          );
    const angle = Math.atan2(gate.position[2], gate.position[0]);
    return {
      id: gate.id,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      size: STARGATE_ICON,
    };
  });

  const extent = Math.max(
    DISPLAY_INNER,
    ...placedPlanets.map((p) => p.orbitRadius),
    ...placedStargates.map((g) => length(g.position)),
  );

  return {
    star: { id: star.id, size: OVERVIEW_STAR_SIZE },
    planets: placedPlanets,
    stargates: placedStargates,
    extent,
    flat: true,
  };
}

/**
 * Build the full layout from the star plus the real positions/radii of the
 * planets (with their moons), stations and stargates.
 */
export function layoutSystem(
  star: StarInput,
  planets: PlanetInput[],
  stations: BodyInput[],
  stargates: BodyInput[],
  mode: LayoutMode,
): SystemLayout {
  return mode === "realistic"
    ? layoutRealistic(star, planets, stations, stargates)
    : layoutOverview(star, planets, stations, stargates, mode);
}
