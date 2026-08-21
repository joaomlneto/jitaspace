/**
 * @jest-environment node
 *
 * Node rather than jsdom: none of this touches the DOM, and the sitemap-index
 * route handler returns a `Response`, which jsdom does not provide.
 */
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

// The index route calls `connection()` to stay request-time; in jest there is
// no request scope, so it resolves to a no-op.
jest.mock("next/server", () => ({ connection: () => Promise.resolve() }));

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
  // An optional catch-all matches zero segments, so `/travel` is a real route
  // even though `travel/` holds no page file of its own.
  travel: { "[[...waypoints]]": { "page.tsx": FILE } },
  // A required catch-all does NOT serve its parent — `/docs` is not a route.
  docs: { "[...slug]": { "page.tsx": FILE } },
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
};

// The stubs forward their arguments so the suite can assert the `where` and
// `orderBy` clauses — without that, deleting either from all 13 sources is a
// mutation no test can see.
type QueryMock = jest.Mock<(args?: unknown) => Promise<unknown[]>>;

const findManyMocks = {} as Record<keyof typeof rows, QueryMock>;
const mockGroupBy = jest.fn<(args?: unknown) => Promise<unknown[]>>();

const prismaStub: Record<string, unknown> = {
  loyaltyStoreOffer: { groupBy: (args?: unknown) => mockGroupBy(args) },
};
for (const model of Object.keys(rows) as (keyof typeof rows)[]) {
  const fn: QueryMock = jest.fn<(args?: unknown) => Promise<unknown[]>>();
  findManyMocks[model] = fn;
  prismaStub[model] = { findMany: (args?: unknown) => fn(args) };
}
jest.mock("~/lib/db", () => ({ prisma: prismaStub }));

/** The single argument object a stubbed query was called with. */
function queryArgs(mock: {
  mock: { calls: (unknown[] | undefined)[] };
}): Record<string, unknown> {
  const call = mock.mock.calls[0];
  if (!call) throw new Error("query was never called");
  return (call[0] ?? {}) as Record<string, unknown>;
}

interface SitemapModule {
  default: (props: { id: Promise<string> }) => Promise<MetadataRoute.Sitemap>;
  generateSitemaps: () => Promise<{ id: number }[]>;
  getSitemapUrls: () => Promise<string[]>;
}

function load(): SitemapModule {
  return require("~/app/sitemap") as SitemapModule;
}

interface RobotsModule {
  default: () => {
    rules: { disallow?: string[] };
    sitemap?: string | string[];
  };
}

function loadRobots(): RobotsModule {
  return require("~/app/robots") as RobotsModule;
}

interface SitemapIndexModule {
  GET: () => Promise<Response>;
}

function loadSitemapIndex(): SitemapIndexModule {
  return require("~/app/sitemap-index.xml/route") as SitemapIndexModule;
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

  it("registers the parent of an optional catch-all, but not of a required one", async () => {
    const locs = await allLocs(load());

    // `[[...waypoints]]` matches zero segments, so /travel is a real page.
    expect(locs).toContain("https://www.jita.space/travel");
    // `[...slug]` requires at least one segment, so /docs is not.
    expect(locs).not.toContain("https://www.jita.space/docs");
  });

  it("omits routes robots.txt disallows, including nested ones", async () => {
    const locs = await allLocs(load());

    expect(locs).not.toContain("https://www.jita.space/mail");
    expect(locs).not.toContain("https://www.jita.space/assets/character");
  });

  it("advertises nothing that the robots.txt it ships alongside disallows", async () => {
    // Cross-checks the sitemap against what `robots.ts` actually emits, not
    // against the shared constant — otherwise a hardcoded array sneaking back
    // into robots.ts would leave both sides passing while production serves a
    // sitemap/robots contradiction.
    const locs = await allLocs(load());
    const { rules } = loadRobots().default();
    const disallow = rules.disallow ?? [];

    expect(disallow.length).toBeGreaterThan(0);
    expect([...disallow].sort()).toEqual([...CRAWLER_DISALLOWED_PATHS].sort());

    const contradictions = locs.filter((loc) => {
      const path = new URL(loc).pathname;
      return disallow.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
    });
    expect(contradictions).toEqual([]);
  });

  it("advertises the index in robots.txt, and the index lists every page", async () => {
    // robots.txt names only the index; the index expands to the numbered pages.
    // Both derive from ./sitemap.ts, so this pins the chain end to end.
    const xml = await (await loadSitemapIndex().GET()).text();
    const indexed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const { sitemap: advertised } = loadRobots().default();
    const pages = await load().generateSitemaps();

    expect(advertised).toBe("https://www.jita.space/sitemap.xml");
    expect(indexed).toEqual(await load().getSitemapUrls());
    expect(indexed).toHaveLength(pages.length);
    expect(xml).toContain("<sitemapindex");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("paginates the index the same way the sitemap itself paginates", async () => {
    const many = Array.from({ length: 60_000 }, (_, i) => ({ typeId: i + 1 }));
    findManyMocks.type.mockResolvedValue(many);

    const xml = await (await loadSitemapIndex().GET()).text();
    const indexed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    expect(indexed).toEqual([
      "https://www.jita.space/sitemap/0.xml",
      "https://www.jita.space/sitemap/1.xml",
    ]);
  });

  it("serves the index as XML", async () => {
    const res = await loadSitemapIndex().GET();
    expect(res.headers.get("content-type")).toContain("application/xml");
  });

  it("filters soft-deleted rows and orders every family deterministically", async () => {
    await allLocs(load());

    for (const model of Object.keys(rows) as (keyof typeof rows)[]) {
      const args = queryArgs(findManyMocks[model]);
      // `/type` additionally excludes typeId 0, whose page renders the
      // not-found UI behind an HTTP 200 — a soft 404 if advertised.
      expect(args.where).toEqual(
        model === "type"
          ? { isDeleted: false, typeId: { gt: 0 } }
          : { isDeleted: false },
      );
      // Without an explicit order the database may return rows in any order,
      // which lets the two sitemap pages overlap and drop URLs.
      expect(args.orderBy).toEqual({ [idField[model]]: "asc" });
    }

    const groupArgs = queryArgs(mockGroupBy);
    expect(groupArgs.where).toEqual({ isDeleted: false });
    expect(groupArgs.by).toEqual(["corporationId"]);
    expect(groupArgs.orderBy).toEqual({ corporationId: "asc" });
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

  it("normalizes trailing slashes on the configured origin", async () => {
    // A run of slashes, not just one: stripping only the last would leave a
    // doubled separator on every URL.
    mockEnv.NEXT_PUBLIC_SITE_URL = "https://www.jita.space///";

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

    // 6 crawlable static routes (incl. the optional catch-all's parent)
    // + 60,000 types + 10 single-row families.
    const TOTAL = 6 + 60_000 + 10;
    const first = await mod.default({ id: Promise.resolve("0") });
    const second = await mod.default({ id: Promise.resolve("1") });

    // Conservation: every URL lands on exactly one page, none invented.
    expect(first).toHaveLength(50_000);
    expect(second).toHaveLength(TOTAL - 50_000);

    const locs = [...first, ...second].map((entry) => entry.url);
    expect(locs).toHaveLength(TOTAL);
    expect(new Set(locs).size).toBe(TOTAL);

    // The page boundary is pinned, so a reordering of the assembled list — the
    // failure the per-query `orderBy` exists to prevent — cannot slip through
    // on length checks alone.
    expect(first.at(-1)?.url).toBe("https://www.jita.space/type/49994");
    expect(second[0]?.url).toBe("https://www.jita.space/type/49995");
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
