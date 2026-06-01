import type { PlanetInput, StarInput, Vec3 } from "../layout";
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

function len(v: Vec3 | undefined): number {
  return Math.hypot(...(v ?? [0, 0, 0]));
}

const STAR: StarInput = { id: 99, radius: 5e8 };

const JITA_PLANETS: PlanetInput[] = [
  {
    id: 1,
    position: vec(40e9, 0, 0), // +x axis, ~0.3 AU
    radius: 6e6,
    moons: [
      { id: 11, position: vec(40e9 + 2e8, 0, 0), radius: 2e5 }, // +x of planet, near
      { id: 12, position: vec(40e9, 0, 4e8), radius: 3e5 }, // +z of planet, farther
    ],
  },
  { id: 2, position: vec(0, 0, 60e9), radius: 4e6, moons: [] }, // +z axis
  {
    id: 3,
    position: vec(-900e9, 0, 0), // -x axis, far
    radius: 5e7,
    moons: [{ id: 31, position: vec(-900e9, 0, 2e8), radius: 1e5 }],
  },
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

describe("displayRadius (overview modes)", () => {
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
    expect(compressed(20) - compressed(10)).toBeGreaterThan(
      compressed(100) - compressed(90),
    );
  });

  it("falls back to the inner radius for compressed edge cases", () => {
    const degenerate = displayRadius(50, 100, 100, "compressed", 0, 1);
    expect(degenerate).toBeGreaterThan(0);
    expect(displayRadius(80, 100, 100, "compressed", 0, 1)).toBe(degenerate);
    expect(displayRadius(0, 10, 100, "compressed", 0, 1)).toBe(degenerate);
  });
});

describe("layoutSystem — realistic", () => {
  it("places every body at its real, scaled 3D position", () => {
    const layout = layoutSystem(STAR, JITA_PLANETS, [], [], "realistic");
    expect(layout.flat).toBe(false);

    const p1 = layout.planets.find((p) => p.id === 1);
    const p3 = layout.planets.find((p) => p.id === 3);
    // planet 1 on +x axis -> x > 0, y = 0, z ≈ 0
    expect(p1?.position[0] ?? 0).toBeGreaterThan(0);
    expect(p1?.position[1]).toBe(0);
    expect(p1?.position[2]).toBeCloseTo(0);
    // planet 3 is much farther out than planet 1 (900e9 vs 40e9)
    expect(len(p3?.position)).toBeGreaterThan(len(p1?.position));
  });

  it("keeps the real vertical (y) coordinate instead of flattening", () => {
    const planets: PlanetInput[] = [
      { id: 1, position: vec(0, 50e9, 0), radius: 1e7, moons: [] },
    ];
    const layout = layoutSystem(STAR, planets, [], [], "realistic");
    expect(layout.planets[0]?.position[1] ?? 0).toBeGreaterThan(0);
  });

  it("places moons at their real offset from the planet (not a band)", () => {
    const { planets } = layoutSystem(STAR, JITA_PLANETS, [], [], "realistic");
    const p1 = planets.find((p) => p.id === 1);
    const moon11 = p1?.satellites.find((s) => s.id === 11); // +x of planet
    const moon12 = p1?.satellites.find((s) => s.id === 12); // +z of planet
    expect(moon11?.position[0] ?? 0).toBeGreaterThan(0);
    expect(moon11?.position[2]).toBeCloseTo(0);
    expect(moon12?.position[2] ?? 0).toBeGreaterThan(0);
    expect(moon12?.position[0]).toBeCloseTo(0);
    // moon 12 is really farther from the planet (4e8 > 2e8)
    expect(len(moon12?.position)).toBeGreaterThan(len(moon11?.position));
  });

  it("sizes bodies proportionally to their real radius", () => {
    const layout = layoutSystem(STAR, JITA_PLANETS, [], [], "realistic");
    const s1 = layout.planets.find((p) => p.id === 1)?.size ?? 0;
    const s2 = layout.planets.find((p) => p.id === 2)?.size ?? 0;
    const s3 = layout.planets.find((p) => p.id === 3)?.size ?? 0;
    // radius 5e7 (p3) > 6e6 (p1) > 4e6 (p2)
    expect(s3).toBeGreaterThan(s1);
    expect(s1).toBeGreaterThan(s2);
    // proportional: size ratio tracks radius ratio
    expect(s3 / s1).toBeCloseTo(5e7 / 6e6, 1);
    // moon sizes track moon radii
    const sats = layout.planets.find((p) => p.id === 1)?.satellites ?? [];
    const m11 = sats.find((s) => s.id === 11)?.size ?? 0;
    const m12 = sats.find((s) => s.id === 12)?.size ?? 0;
    expect(m12).toBeGreaterThan(m11); // 3e5 > 2e5
  });

  it("caps the star so it stays inside the innermost orbit", () => {
    const layout = layoutSystem(STAR, JITA_PLANETS, [], [], "realistic");
    const innerOrbit = Math.min(...layout.planets.map((p) => len(p.position)));
    expect(layout.star.size).toBeGreaterThan(0);
    expect(layout.star.size).toBeLessThan(innerOrbit);
  });

  it("does not cap when the star has no radius (and floors tiny bodies)", () => {
    const planets: PlanetInput[] = [
      {
        id: 1,
        position: vec(40e9, 0, 0),
        radius: 0,
        moons: [{ id: 11, position: vec(40e9, 0, 1e8) }], // no radius
      },
    ];
    const layout = layoutSystem(
      { id: 99, radius: 0 },
      planets,
      [],
      [],
      "realistic",
    );
    expect(layout.star.size).toBeGreaterThan(0); // floored, not zero
    expect(layout.planets[0]?.satellites[0]?.size ?? 0).toBeGreaterThan(0);
  });

  it("places stargates at their real scaled position", () => {
    const stargates = [{ id: 50, position: vec(0, 0, -6000e9) }];
    const layout = layoutSystem(STAR, JITA_PLANETS, [], stargates, "realistic");
    const gate = layout.stargates[0];
    expect(gate?.position[0]).toBeCloseTo(0);
    expect(gate?.position[2] ?? 0).toBeLessThan(0); // -z axis preserved
    expect(layout.extent).toBeGreaterThanOrEqual(len(gate?.position));
  });

  it("assigns stations to their nearest planet at real positions", () => {
    const stations = [
      { id: 60, position: vec(41e9, 1e9, 0) }, // nearest planet 1
      { id: 61, position: vec(-890e9, 0, 0) }, // nearest planet 3
    ];
    const { planets } = layoutSystem(
      STAR,
      JITA_PLANETS,
      stations,
      [],
      "realistic",
    );
    expect(
      planets.find((p) => p.id === 1)?.satellites.some((s) => s.id === 60),
    ).toBe(true);
    expect(
      planets.find((p) => p.id === 3)?.satellites.some((s) => s.id === 61),
    ).toBe(true);
  });
});

describe("layoutSystem — overview", () => {
  it("is flat and uses the real angle in overview modes", () => {
    const { planets, flat } = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      [],
      "compressed",
    );
    expect(flat).toBe(true);
    const p1 = planets.find((p) => p.id === 1);
    const p2 = planets.find((p) => p.id === 2);
    // planet 1 on +x -> z ≈ 0, x > 0; planet 2 on +z -> x ≈ 0, z > 0
    expect(p1?.position[2]).toBeCloseTo(0);
    expect(p1?.position[0] ?? 0).toBeGreaterThan(0);
    expect(p2?.position[0]).toBeCloseTo(0);
    expect(p2?.position[2] ?? 0).toBeGreaterThan(0);
  });

  it("orders planets radially by real distance in 'rings'", () => {
    const { planets } = layoutSystem(STAR, JITA_PLANETS, [], [], "rings");
    const radii = new Map(planets.map((p) => [p.id, p.orbitRadius]));
    expect(radii.get(1) ?? 0).toBeLessThan(radii.get(2) ?? 0);
    expect(radii.get(2) ?? 0).toBeLessThan(radii.get(3) ?? 0);
  });

  it("clusters moons and nearest stations around their planet", () => {
    const stations = [
      { id: 60, position: vec(41e9, 1e9, 0) },
      { id: 61, position: vec(-890e9, 0, 0) },
    ];
    const { planets } = layoutSystem(
      STAR,
      JITA_PLANETS,
      stations,
      [],
      "compressed",
    );
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

  it("falls back to a fan direction for a moon on the planet centre", () => {
    const planets: PlanetInput[] = [
      {
        id: 1,
        position: vec(40e9, 0, 0),
        radius: 6e6,
        moons: [{ id: 11, position: vec(40e9, 0, 0), radius: 1e5 }], // on planet
      },
    ];
    const moon = layoutSystem(STAR, planets, [], [], "compressed").planets[0]
      ?.satellites[0];
    expect(moon?.id).toBe(11);
    expect(Number.isFinite(moon?.position[0] ?? NaN)).toBe(true);
    expect(len(moon?.position)).toBeGreaterThan(0);
  });

  it("places stargates at the same angle but a larger radius in 'rings'", () => {
    const stargates = [{ id: 50, position: vec(0, 0, -4000e9) }]; // -z axis
    const { planets, stargates: placed } = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      stargates,
      "rings",
    );
    const gate = placed[0];
    expect(gate?.position[0]).toBeCloseTo(0);
    expect(gate?.position[2] ?? 0).toBeLessThan(0);
    const maxPlanet = Math.max(...planets.map((p) => p.orbitRadius));
    expect(len(gate?.position)).toBeGreaterThan(maxPlanet);
  });

  it("places stargates by distance in 'compressed'", () => {
    const stargates = [{ id: 50, position: vec(0, 0, -7000e9) }];
    const { stargates: placed } = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      stargates,
      "compressed",
    );
    expect(len(placed[0]?.position)).toBeGreaterThan(0);
  });

  it("sizes planets proportionally and fixes the overview star size", () => {
    const { planets, star } = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      [],
      "compressed",
    );
    const s1 = planets.find((p) => p.id === 1)?.size ?? 0;
    const s3 = planets.find((p) => p.id === 3)?.size ?? 0;
    expect(s3).toBeGreaterThan(s1); // bigger radius -> bigger
    // overview star is a fixed reference size, not the realistic (capped) one
    expect(star.size).toBeGreaterThan(1);
  });
});

describe("layoutSystem — modes differ", () => {
  it("changes a planet's radius (not its angle) between realistic and rings", () => {
    const realistic = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      [],
      "realistic",
    ).planets.find((p) => p.id === 1);
    const rings = layoutSystem(
      STAR,
      JITA_PLANETS,
      [],
      [],
      "rings",
    ).planets.find((p) => p.id === 1);
    expect(realistic?.position[2]).toBeCloseTo(0);
    expect(rings?.position[2]).toBeCloseTo(0);
    expect(realistic?.orbitRadius ?? 0).not.toBeCloseTo(
      rings?.orbitRadius ?? 0,
    );
  });
});

describe("degenerate inputs", () => {
  it("drops stations that have no planet to attach to (overview)", () => {
    const layout = layoutSystem(
      STAR,
      [],
      [{ id: 60, position: vec(1e9, 0, 0) }],
      [],
      "compressed",
    );
    expect(layout.planets).toHaveLength(0);
    expect(layout.extent).toBeGreaterThan(0);
  });

  it("handles an empty system without crashing (realistic)", () => {
    const layout = layoutSystem(STAR, [], [], [], "realistic");
    expect(layout.planets).toHaveLength(0);
    expect(layout.stargates).toHaveLength(0);
    expect(Number.isFinite(layout.star.size)).toBe(true);
    expect(layout.extent).toBeGreaterThan(0);
  });
});
