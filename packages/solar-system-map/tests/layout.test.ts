import type { PlanetInput, Vec3 } from "../layout";
import {
  displayRadius,
  layoutSystem,
  nearestPlanetId,
  PLANET_COLORS,
  planetColor,
} from "../layout";

function vec(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

const JITA_PLANETS: PlanetInput[] = [
  { id: 1, position: vec(40e9, 0, 0), moonIds: [11, 12] }, // +x axis, ~0.3 AU
  { id: 2, position: vec(0, 0, 60e9), moonIds: [] }, // +z axis
  { id: 3, position: vec(-900e9, 0, 0), moonIds: [31] }, // -x axis, far
];

describe("planetColor", () => {
  it("cycles through the palette", () => {
    expect(planetColor(0)).toBe(PLANET_COLORS[0]);
    expect(planetColor(PLANET_COLORS.length)).toBe(PLANET_COLORS[0]);
    expect(planetColor(PLANET_COLORS.length + 2)).toBe(PLANET_COLORS[2]);
  });
});

describe("nearestPlanetId", () => {
  it("returns the closest planet", () => {
    expect(nearestPlanetId(vec(41e9, 1e9, 0), JITA_PLANETS)).toBe(1);
    expect(nearestPlanetId(vec(0, 0, 61e9), JITA_PLANETS)).toBe(2);
    expect(nearestPlanetId(vec(-880e9, 0, 0), JITA_PLANETS)).toBe(3);
  });

  it("returns undefined when there are no planets", () => {
    expect(nearestPlanetId(vec(0, 0, 0), [])).toBeUndefined();
  });
});

describe("displayRadius", () => {
  it("is linear in distance for 'scale'", () => {
    const r1 = displayRadius(25, 10, 100, "scale", 0, 3);
    const r2 = displayRadius(50, 10, 100, "scale", 0, 3);
    expect(r2).toBeCloseTo(2 * r1);
    expect(displayRadius(100, 10, 100, "scale", 0, 3)).toBeGreaterThan(r2);
  });

  it("is evenly spaced by rank for 'rings' (distance ignored)", () => {
    const r0 = displayRadius(999, 10, 100, "rings", 0, 4);
    const r1 = displayRadius(5, 10, 100, "rings", 1, 4);
    const r2 = displayRadius(50, 10, 100, "rings", 2, 4);
    expect(r1).toBeGreaterThan(r0);
    expect(r2).toBeGreaterThan(r1);
    expect(r1 - r0).toBeCloseTo(r2 - r1);
  });

  it("is monotonic and compressed for 'compressed'", () => {
    const compressed = (d: number) =>
      displayRadius(d, 10, 100, "compressed", 0, 3);
    expect(compressed(10)).toBeLessThan(compressed(31.6));
    expect(compressed(31.6)).toBeLessThan(compressed(100));
    // a fixed linear interval maps to more display radius near the inner edge
    // than near the outer edge (log compression spreads the inner system out)
    expect(compressed(20) - compressed(10)).toBeGreaterThan(
      compressed(100) - compressed(90),
    );
  });
});

describe("layoutSystem", () => {
  it("preserves each planet's real angular position (and flattens to y=0)", () => {
    const { planets } = layoutSystem(JITA_PLANETS, [], [], "compressed");
    const p1 = planets.find((p) => p.id === 1);
    const p2 = planets.find((p) => p.id === 2);
    // planet 1 is on the +x axis -> z ≈ 0, x > 0
    expect(p1?.position[2]).toBeCloseTo(0);
    expect(p1?.position[0] ?? 0).toBeGreaterThan(0);
    expect(p1?.position[1]).toBe(0);
    // planet 2 is on the +z axis -> x ≈ 0, z > 0
    expect(p2?.position[0]).toBeCloseTo(0);
    expect(p2?.position[2] ?? 0).toBeGreaterThan(0);
  });

  it("orders planets radially by real distance in 'rings' mode", () => {
    const { planets } = layoutSystem(JITA_PLANETS, [], [], "rings");
    const radii = new Map(planets.map((p) => [p.id, p.orbitRadius]));
    // planet 1 (0.3 AU) inside planet 2 inside planet 3 (far)
    expect(radii.get(1) ?? 0).toBeLessThan(radii.get(2) ?? 0);
    expect(radii.get(2) ?? 0).toBeLessThan(radii.get(3) ?? 0);
  });

  it("clusters moons and nearest stations around their planet", () => {
    const stations = [
      { id: 60, position: vec(41e9, 1e9, 0) }, // nearest planet 1
      { id: 61, position: vec(-890e9, 0, 0) }, // nearest planet 3
    ];
    const { planets } = layoutSystem(JITA_PLANETS, stations, [], "compressed");
    const p1 = planets.find((p) => p.id === 1);
    const p3 = planets.find((p) => p.id === 3);
    expect(
      p1?.satellites.filter((s) => s.kind === "moon").map((s) => s.id),
    ).toEqual([11, 12]);
    expect(
      p1?.satellites.some((s) => s.kind === "station" && s.id === 60),
    ).toBe(true);
    expect(
      p3?.satellites.some((s) => s.kind === "station" && s.id === 61),
    ).toBe(true);
  });

  it("places stargates at the same angle but a larger radius in 'rings'", () => {
    const stargates = [{ id: 50, position: vec(0, 0, -4000e9) }]; // -z axis
    const { planets, stargates: placed } = layoutSystem(
      JITA_PLANETS,
      [],
      stargates,
      "rings",
    );
    const gate = placed[0];
    // -z axis -> x ≈ 0, z < 0
    expect(gate?.position[0]).toBeCloseTo(0);
    expect(gate?.position[2] ?? 0).toBeLessThan(0);
    // beyond the outermost planet ring
    const maxPlanet = Math.max(...planets.map((p) => p.orbitRadius));
    expect(Math.hypot(...(gate?.position ?? [0, 0, 0]))).toBeGreaterThan(
      maxPlanet,
    );
  });

  it("changes the radius but not the angle across modes", () => {
    const scale = layoutSystem(JITA_PLANETS, [], [], "scale").planets.find(
      (p) => p.id === 1,
    );
    const rings = layoutSystem(JITA_PLANETS, [], [], "rings").planets.find(
      (p) => p.id === 1,
    );
    // same angle (both on +x, z ≈ 0)
    expect(scale?.position[2]).toBeCloseTo(0);
    expect(rings?.position[2]).toBeCloseTo(0);
    // different radius
    expect(scale?.orbitRadius).not.toBeCloseTo(rings?.orbitRadius ?? 0);
    expect(layoutSystem(JITA_PLANETS, [], [], "scale").extent).toBeGreaterThan(
      0,
    );
  });
});
