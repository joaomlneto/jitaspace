import { join, relative, sep } from "node:path";
import type { MetadataRoute } from "next";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Not mocked — the sitemap must agree with the very list robots.txt publishes.
import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";

// `~/env` is stubbed rather than validated: `~/config/constants` reads
// NEXT_PUBLIC_SITE_URL at module load, and driving it from a mutable object lets
// the trailing-slash case re-resolve it after `jest.resetModules()`.
const mockEnv: Record<string, string | undefined> = {};
jest.mock("~/env", () => ({ env: mockEnv }));

// A fake `app/` tree — walking the real one would make these assertions move
// every time a route is added.
interface Tree {
  [name: string]: Tree | null;
}
const FILE = null;

const APP_TREE: Tree = {
  "page.tsx": FILE,
  about: { "page.tsx": FILE },
  history: { "page.tsx": FILE, build: { "[build]": { "page.tsx": FILE } } },
  // Route groups and parallel segments contribute no path segment of their own.
  "(marketing)": { promo: { "page.tsx": FILE } },
  "@modal": { preview: { "page.tsx": FILE } },
  // Disallowed: directly, and via a prefix match on a nested route.
  mail: { "page.tsx": FILE },
  assets: { character: { "page.tsx": FILE } },
  // Dynamic segments never become static routes.
  type: { "[typeId]": { "page.tsx": FILE } },
  // Directories without a page file are traversed but contribute nothing.
  components: { "helper.ts": FILE },
};

const APP_DIR = join(process.cwd(), "app");

function resolveDir(dir: string): Tree {
  const rel = relative(APP_DIR, dir);
  let node: Tree = APP_TREE;
  if (rel === "") return node;
  for (const segment of rel.split(sep)) {
    const next = node[segment];
    if (next == null) throw new Error(`ENOENT: ${dir}`);
    node = next;
  }
  return node;
}

const mockReaddir = jest.fn((dir: unknown) => {
  const entries = Object.entries(resolveDir(String(dir)));
  return Promise.resolve(
    entries.map(([name, child]) => ({
      name,
      isFile: () => child === FILE,
      isDirectory: () => child !== FILE,
    })),
  );
});
jest.mock("node:fs/promises", () => ({
  // The `withFileTypes` option is implied by the fake entries below, so the
  // mock only ever needs the directory.
  readdir: (dir: unknown) => mockReaddir(dir),
}));

// One `findMany` per entity family, keyed by the prisma model accessor the
// source uses, plus `groupBy` for the loyalty-store corporations.
const rows = {
  type: [603, 587],
  category: [6],
  group: [25],
  region: [10000002],
  constellation: [20000020],
  solarSystem: [30000142],
  station: [60003760],
  faction: [500001],
  race: [1],
  bloodline: [1],
  dogmaAttribute: [9],
  dogmaEffect: [11],
};

const idField: Record<keyof typeof rows, string> = {
  type: "typeId",
  category: "categoryId",
  group: "groupId",
  region: "regionId",
  constellation: "constellationId",
  solarSystem: "solarSystemId",
  station: "stationId",
  faction: "factionId",
  race: "raceId",
  bloodline: "bloodlineId",
  dogmaAttribute: "attributeId",
  dogmaEffect: "effectId",
};

const findManyMocks = {} as Record<
  keyof typeof rows,
  jest.Mock<() => Promise<unknown[]>>
>;
const mockGroupBy = jest.fn<() => Promise<unknown[]>>();

const prismaStub: Record<string, unknown> = {
  loyaltyStoreOffer: { groupBy: () => mockGroupBy() },
};
for (const model of Object.keys(rows) as (keyof typeof rows)[]) {
  const fn = jest.fn<() => Promise<unknown[]>>();
  findManyMocks[model] = fn;
  prismaStub[model] = { findMany: () => fn() };
}
jest.mock("~/lib/db", () => ({ prisma: prismaStub }));

interface SitemapModule {
  default: (props: { id: Promise<string> }) => Promise<MetadataRoute.Sitemap>;
  generateSitemaps: () => Promise<{ id: number }[]>;
  getSitemapUrls: () => Promise<string[]>;
}

function load(): SitemapModule {
  return require("~/app/sitemap") as SitemapModule;
}

/** Every `<loc>` the sitemap would emit, across all of its pages. */
async function allLocs(mod: SitemapModule): Promise<string[]> {
  const pages = await mod.generateSitemaps();
  const locs: string[] = [];
  for (const { id } of pages) {
    const entries = await mod.default({ id: Promise.resolve(String(id)) });
    locs.push(...entries.map((entry) => entry.url));
  }
  return locs;
}

describe("sitemap", () => {
  beforeEach(() => {
    jest.resetModules();
    mockEnv.NEXT_PUBLIC_SITE_URL = "https://www.jita.space";
    mockEnv.NEXT_PUBLIC_MODIFIED_DATE = "2026-01-01T00:00:00.000Z";
    mockReaddir.mockClear();
    for (const model of Object.keys(rows) as (keyof typeof rows)[]) {
      findManyMocks[model].mockReset();
      findManyMocks[model].mockResolvedValue(
        rows[model].map((id) => ({ [idField[model]]: id })),
      );
    }
    mockGroupBy.mockReset();
    mockGroupBy.mockResolvedValue([{ corporationId: 1000035 }]);
  });

  it("emits only absolute URLs", async () => {
    const locs = await allLocs(load());

    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc.startsWith("https://www.jita.space/")).toBe(true);
      expect(() => new URL(loc)).not.toThrow();
    }
  });

  it("includes crawlable static routes, resolving groups and parallel segments", async () => {
    const locs = await allLocs(load());

    expect(locs).toContain("https://www.jita.space/");
    expect(locs).toContain("https://www.jita.space/about");
    expect(locs).toContain("https://www.jita.space/history");
    expect(locs).toContain("https://www.jita.space/promo");
    expect(locs).toContain("https://www.jita.space/preview");
  });

  it("omits routes robots.txt disallows, including nested ones", async () => {
    const locs = await allLocs(load());

    expect(locs).not.toContain("https://www.jita.space/mail");
    expect(locs).not.toContain("https://www.jita.space/assets/character");
  });

  it("agrees with the robots.txt disallow list", async () => {
    const locs = await allLocs(load());

    const contradictions = locs.filter((loc) => {
      const path = new URL(loc).pathname;
      return CRAWLER_DISALLOWED_PATHS.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
    });
    expect(contradictions).toEqual([]);
  });

  it("never emits a dynamic segment as a literal route", async () => {
    const locs = await allLocs(load());

    for (const loc of locs) {
      expect(loc).not.toContain("[");
    }
    expect(locs).not.toContain("https://www.jita.space/type");
  });

  it("emits every database-backed entity family", async () => {
    const locs = await allLocs(load());

    expect(locs).toEqual(
      expect.arrayContaining([
        "https://www.jita.space/type/603",
        "https://www.jita.space/category/6",
        "https://www.jita.space/group/25",
        "https://www.jita.space/region/10000002",
        "https://www.jita.space/constellation/20000020",
        "https://www.jita.space/system/30000142",
        "https://www.jita.space/station/60003760",
        "https://www.jita.space/faction/500001",
        "https://www.jita.space/race/1",
        "https://www.jita.space/bloodline/1",
        "https://www.jita.space/dogma/attribute/9",
        "https://www.jita.space/dogma/effect/11",
        "https://www.jita.space/lp-store/1000035",
      ]),
    );
  });

  it("drops one family rather than the whole sitemap when its query fails", async () => {
    findManyMocks.station.mockRejectedValue(new Error("connection refused"));
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const locs = await allLocs(load());

    expect(locs).not.toContain("https://www.jita.space/station/60003760");
    expect(locs).toContain("https://www.jita.space/system/30000142");
    expect(locs).toContain("https://www.jita.space/");
    errorSpy.mockRestore();
  });

  it("does not cache a degraded list once the failing family recovers", async () => {
    findManyMocks.station.mockRejectedValue(new Error("connection refused"));
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const mod = load();

    expect(await allLocs(mod)).not.toContain(
      "https://www.jita.space/station/60003760",
    );

    findManyMocks.station.mockResolvedValue([{ stationId: 60003760 }]);

    expect(await allLocs(mod)).toContain(
      "https://www.jita.space/station/60003760",
    );
    errorSpy.mockRestore();
  });

  it("normalizes a trailing slash on the configured origin", async () => {
    mockEnv.NEXT_PUBLIC_SITE_URL = "https://www.jita.space/";

    const locs = await allLocs(load());

    expect(locs).toContain("https://www.jita.space/");
    expect(locs).toContain("https://www.jita.space/type/603");
    expect(locs.some((loc) => loc.includes("//type"))).toBe(false);
  });

  it("paginates past the 50k per-file limit without dropping or repeating URLs", async () => {
    const many = Array.from({ length: 60_000 }, (_, index) => index + 1);
    findManyMocks.type.mockResolvedValue(many.map((typeId) => ({ typeId })));
    const mod = load();

    const pages = await mod.generateSitemaps();
    expect(pages).toEqual([{ id: 0 }, { id: 1 }]);

    const first = await mod.default({ id: Promise.resolve("0") });
    expect(first).toHaveLength(50_000);

    const locs = await allLocs(mod);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain("https://www.jita.space/type/60000");
  });

  it("returns an empty page for an out-of-range or malformed id", async () => {
    const mod = load();

    expect(await mod.default({ id: Promise.resolve("99") })).toEqual([]);
    // A malformed id normalizes to page 0 rather than producing a negative slice.
    expect(
      (await mod.default({ id: Promise.resolve("nonsense") })).length,
    ).toBeGreaterThan(0);
  });

  it("advertises one sitemap URL per generated page", async () => {
    const mod = load();

    expect(await mod.getSitemapUrls()).toEqual([
      "https://www.jita.space/sitemap/0.xml",
    ]);
  });

  it("reuses the assembled list instead of re-querying per sitemap page", async () => {
    const mod = load();

    await allLocs(mod);
    await allLocs(mod);

    expect(findManyMocks.type).toHaveBeenCalledTimes(1);
  });
});
