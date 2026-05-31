import type { ScenePlanet } from "../layout";
import {
  buildSystemLayout,
  FIRST_ORBIT,
  moonOrbit,
  ORBIT_STEP,
  PLANET_BASE_SIZE,
  PLANET_COLORS,
  planetColor,
  ringMarkerAngles,
  ringMarkerPosition,
} from "../layout";

function makePlanets(count: number): ScenePlanet[] {
  return Array.from({ length: count }, (_, i) => ({
    planetId: 40000000 + i,
    moonIds: [],
    beltIds: [],
  }));
}

describe("planetColor", () => {
  it("returns the palette colour for the index", () => {
    expect(planetColor(0)).toBe(PLANET_COLORS[0]);
    expect(planetColor(2)).toBe(PLANET_COLORS[2]);
  });

  it("cycles through the palette", () => {
    expect(planetColor(PLANET_COLORS.length)).toBe(PLANET_COLORS[0]);
    expect(planetColor(PLANET_COLORS.length + 1)).toBe(PLANET_COLORS[1]);
  });
});

describe("buildSystemLayout", () => {
  it("handles an empty system", () => {
    const layout = buildSystemLayout([]);
    expect(layout.planets).toHaveLength(0);
    expect(layout.outerOrbit).toBe(FIRST_ORBIT);
    expect(layout.stationRing).toBeGreaterThan(layout.outerOrbit);
    expect(layout.stargateRing).toBeGreaterThan(layout.stationRing);
    expect(layout.camDistance).toBeGreaterThan(0);
  });

  it("places planets on evenly-spaced concentric orbits", () => {
    const layout = buildSystemLayout(makePlanets(3));
    expect(layout.planets.map((p) => p.orbit)).toEqual([
      FIRST_ORBIT,
      FIRST_ORBIT + ORBIT_STEP,
      FIRST_ORBIT + 2 * ORBIT_STEP,
    ]);
    expect(layout.outerOrbit).toBe(FIRST_ORBIT + 2 * ORBIT_STEP);
  });

  it("keeps the ring ordering star < planets < stations < stargates", () => {
    const layout = buildSystemLayout(makePlanets(5));
    expect(layout.outerOrbit).toBeLessThan(layout.stationRing);
    expect(layout.stationRing).toBeLessThan(layout.stargateRing);
    expect(layout.stargateRing).toBeLessThan(layout.camDistance);
  });

  it("derives a deterministic colour, size and phase per planet", () => {
    const planets: ScenePlanet[] = [{ planetId: 42, moonIds: [], beltIds: [] }];
    const [planet] = buildSystemLayout(planets).planets;
    expect(planet?.color).toBe(planetColor(0));
    expect(planet?.size).toBeCloseTo(PLANET_BASE_SIZE + (42 % 4) * 0.06);
    expect(planet?.phase).toBeCloseTo(((42 % 360) * Math.PI) / 180);
  });
});

describe("moonOrbit", () => {
  it("pushes successive moons to wider orbits", () => {
    expect(moonOrbit(0.5, 2)).toBeGreaterThan(moonOrbit(0.5, 0));
  });
});

describe("ringMarkerAngles", () => {
  it("returns evenly-spaced angles", () => {
    expect(ringMarkerAngles(4)).toEqual([
      0,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
    ]);
  });

  it("returns an empty array for zero markers", () => {
    expect(ringMarkerAngles(0)).toEqual([]);
  });
});

describe("ringMarkerPosition", () => {
  it("places the first marker on the +x axis", () => {
    const [x, y, z] = ringMarkerPosition(0, 4, 10);
    expect(x).toBeCloseTo(10);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(0);
  });

  it("places the second of four markers on the +z axis", () => {
    const [x, y, z] = ringMarkerPosition(1, 4, 10);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(10);
  });
});
