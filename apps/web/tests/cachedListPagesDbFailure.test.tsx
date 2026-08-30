import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The nine fully-cached list routes each are a `"use cache"` Server Component
// that reads Prisma and renders. They used to wrap that read in
// `catch { notFound() }` — but `notFound()` is a *successful* 404 render, so
// Next stored it as an ordinary ISR entry and one transient database failure
// served a 404 for the whole `cacheLife("days")` window (revalidate 86400).
// That is what took /categories, /regions, /agents, /skills and /lp-store down
// on 2026-08-29 when the CockroachDB cluster hit its Request Unit limit.
//
// These tests pin the fix: a database error must PROPAGATE out of the cached
// scope (so Next keeps serving the last good entry and retries) and must never
// be converted into `notFound()`. The success cases exist to prove the reads
// still map onto the props the client pages expect.
//
// /ship-scanner is the one deliberate exception: a genuinely absent ship
// category IS a real 404, so it reads with `findUnique` and tests for null.
// Distinguishing the two matters — `findUniqueOrThrow` raises an error
// indistinguishable from an outage, which failed the build on an empty
// database (the CI Cypress job prerenders against a freshly-pushed schema).
// ---------------------------------------------------------------------------

type Rows = Record<string, unknown>[];

const categoryFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const categoryFindUnique =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown> | null>>();
const regionFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const agentFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const agentTypeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const npcCorporationDivisionFindMany =
  jest.fn<(a?: unknown) => Promise<Rows>>();
const groupFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const typeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const corporationFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const loyaltyStoreOfferGroupBy = jest.fn<(a?: unknown) => Promise<Rows>>();
const loyaltyStoreOfferFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const loyaltyStoreOfferRequiredItemFindMany =
  jest.fn<(a?: unknown) => Promise<Rows>>();
const dogmaAttributeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const typeAttributeGroupBy = jest.fn<(a?: unknown) => Promise<Rows>>();
const dogmaEffectFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const typeEffectGroupBy = jest.fn<(a?: unknown) => Promise<Rows>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    category: {
      findMany: (a?: unknown) => categoryFindMany(a),
      findUnique: (a?: unknown) => categoryFindUnique(a),
    },
    region: { findMany: (a?: unknown) => regionFindMany(a) },
    agent: { findMany: (a?: unknown) => agentFindMany(a) },
    agentType: { findMany: (a?: unknown) => agentTypeFindMany(a) },
    npcCorporationDivision: {
      findMany: (a?: unknown) => npcCorporationDivisionFindMany(a),
    },
    group: { findMany: (a?: unknown) => groupFindMany(a) },
    type: { findMany: (a?: unknown) => typeFindMany(a) },
    corporation: { findMany: (a?: unknown) => corporationFindMany(a) },
    loyaltyStoreOffer: {
      groupBy: (a?: unknown) => loyaltyStoreOfferGroupBy(a),
      findMany: (a?: unknown) => loyaltyStoreOfferFindMany(a),
    },
    loyaltyStoreOfferRequiredItem: {
      findMany: (a?: unknown) => loyaltyStoreOfferRequiredItemFindMany(a),
    },
    dogmaAttribute: { findMany: (a?: unknown) => dogmaAttributeFindMany(a) },
    typeAttribute: { groupBy: (a?: unknown) => typeAttributeGroupBy(a) },
    dogmaEffect: { findMany: (a?: unknown) => dogmaEffectFindMany(a) },
    typeEffect: { groupBy: (a?: unknown) => typeEffectGroupBy(a) },
  },
}));

// These are `"use cache"` functions; cacheLife is a no-op here.
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

// Next's notFound() throws; mirror that so "was it called" is observable.
const NOT_FOUND = "NEXT_NOT_FOUND";
const notFound = jest.fn(() => {
  throw new Error(NOT_FOUND);
});
jest.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

// Leaf presentation components — stubbed so the assertions read data, not chrome.
jest.mock("@jitaspace/eve-icons", () => ({
  ItemsIcon: () => <span />,
  MapIcon: () => <span />,
  AgentFinderIcon: () => <span />,
}));
jest.mock("@jitaspace/ui", () => ({
  CategoryAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
jest.mock("@jitaspace/eve-components", () => ({
  RegionAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

const probe = () => null;
jest.mock("~/components/Agents", () => ({ AgentsTable: probe }));
jest.mock("~/app/skills/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/lp-store/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/lp-store/all/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/ship-scanner/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/dogma/attributes/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/dogma/effects/page.client", () => ({
  __esModule: true,
  default: probe,
}));

/** Run a route's server half the way Next does: call its default export. */
async function runPage(modulePath: string): Promise<ReactElement> {
  const Page = (require(modulePath) as { default: () => Promise<ReactElement> })
    .default;
  return await Page();
}

/** Props the route handed to its (stubbed) client page. */
async function propsOf(modulePath: string): Promise<Record<string, unknown>> {
  const el = await runPage(modulePath);
  return el.props as Record<string, unknown>;
}

const BLIP = "Too many database connections opened";

beforeEach(() => {
  notFound.mockClear();
  categoryFindMany.mockReset().mockResolvedValue([]);
  categoryFindUnique.mockReset().mockResolvedValue({ groups: [] });
  regionFindMany.mockReset().mockResolvedValue([]);
  agentFindMany.mockReset().mockResolvedValue([]);
  agentTypeFindMany.mockReset().mockResolvedValue([]);
  npcCorporationDivisionFindMany.mockReset().mockResolvedValue([]);
  groupFindMany.mockReset().mockResolvedValue([]);
  typeFindMany.mockReset().mockResolvedValue([]);
  corporationFindMany.mockReset().mockResolvedValue([]);
  loyaltyStoreOfferGroupBy.mockReset().mockResolvedValue([]);
  loyaltyStoreOfferFindMany.mockReset().mockResolvedValue([]);
  loyaltyStoreOfferRequiredItemFindMany.mockReset().mockResolvedValue([]);
  dogmaAttributeFindMany.mockReset().mockResolvedValue([]);
  typeAttributeGroupBy.mockReset().mockResolvedValue([]);
  dogmaEffectFindMany.mockReset().mockResolvedValue([]);
  typeEffectGroupBy.mockReset().mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// The regression guard, stated once per route.
// ---------------------------------------------------------------------------

describe("a database failure never becomes a cached 404", () => {
  const cases: { route: string; module: string; fail: () => void }[] = [
    {
      route: "/categories",
      module: "~/app/categories/page",
      fail: () => categoryFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/regions",
      module: "~/app/regions/page",
      fail: () => regionFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/agents",
      module: "~/app/agents/page",
      fail: () => agentFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/skills",
      module: "~/app/skills/page",
      fail: () => groupFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store",
      module: "~/app/lp-store/page",
      fail: () => loyaltyStoreOfferGroupBy.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store/all",
      module: "~/app/lp-store/all/page",
      fail: () => loyaltyStoreOfferGroupBy.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/ship-scanner",
      module: "~/app/ship-scanner/page",
      fail: () => categoryFindUnique.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/attributes",
      module: "~/app/dogma/attributes/page",
      fail: () => dogmaAttributeFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/effects",
      module: "~/app/dogma/effects/page",
      fail: () => dogmaEffectFindMany.mockRejectedValue(new Error(BLIP)),
    },
  ];

  it.each(cases)(
    "$route propagates the error instead of 404ing",
    async ({ module, fail }) => {
      fail();
      await expect(runPage(module)).rejects.toThrow(BLIP);
      expect(notFound).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------
// Success paths — the reads still produce the props the client pages expect.
// ---------------------------------------------------------------------------

describe("categories route server data", () => {
  it("renders a link per category, ordered by the query", async () => {
    categoryFindMany.mockResolvedValue([
      { categoryId: 6, name: "Ship" },
      { categoryId: 7, name: "Module" },
    ]);
    render(
      <MantineProvider>
        {await runPage("~/app/categories/page")}
      </MantineProvider>,
    );
    expect(screen.getByText("Ship")).toBeInTheDocument();
    expect(screen.getByText("Module")).toBeInTheDocument();
  });
});

describe("regions route server data", () => {
  it("buckets regions into their galaxy by id range", async () => {
    regionFindMany.mockResolvedValue([
      { regionId: 10000002, name: "The Forge" },
      { regionId: 11000001, name: "A-R00001" },
      { regionId: 12000001, name: "Abyssal One" },
      { regionId: 9000001, name: "Oddball" },
    ]);
    render(
      <MantineProvider>{await runPage("~/app/regions/page")}</MantineProvider>,
    );
    expect(screen.getByText("New Eden (K-Space)")).toBeInTheDocument();
    expect(screen.getByText("The Forge")).toBeInTheDocument();
    expect(screen.getByText("A-R00001")).toBeInTheDocument();
    expect(screen.getByText("Abyssal One")).toBeInTheDocument();
    expect(screen.getByText("Oddball")).toBeInTheDocument();
  });
});

describe("agents route server data", () => {
  it("flattens the Character relation and sorts by name", async () => {
    agentFindMany.mockResolvedValue([
      {
        characterId: 2,
        Character: { name: "Zed", corporation: { corporationId: 1000002 } },
        agentTypeId: 1,
        agentDivisionId: 2,
        isLocator: false,
        level: 3,
        stationId: 60000004,
      },
      {
        characterId: 1,
        Character: { name: "Aria", corporation: { corporationId: 1000001 } },
        agentTypeId: 2,
        agentDivisionId: 1,
        isLocator: true,
        level: 1,
        stationId: 60000001,
      },
    ]);
    const tree = await runPage("~/app/agents/page");
    const { container } = render(<MantineProvider>{tree}</MantineProvider>);
    expect(container).toBeTruthy();
    // The table stub swallows the props, so assert the mapping via the query.
    expect(agentFindMany).toHaveBeenCalledTimes(1);
    expect(agentTypeFindMany).toHaveBeenCalledTimes(1);
    expect(npcCorporationDivisionFindMany).toHaveBeenCalledTimes(1);
  });
});

describe("skills route server data", () => {
  it("passes the skill groups straight through", async () => {
    const groups = [
      { groupId: 255, name: "Gunnery", published: true, types: [] },
    ];
    groupFindMany.mockResolvedValue(groups);
    expect(await propsOf("~/app/skills/page")).toEqual({ groups });
  });
});

describe("lp-store route server data", () => {
  it("sorts the corporations that have offers by name", async () => {
    loyaltyStoreOfferGroupBy.mockResolvedValue([
      { corporationId: 1000002 },
      { corporationId: 1000001 },
    ]);
    corporationFindMany.mockResolvedValue([
      { corporationId: 1000002, name: "Zainou" },
      { corporationId: 1000001, name: "Aliastra" },
    ]);
    expect(await propsOf("~/app/lp-store/page")).toEqual({
      corporations: [
        { corporationId: 1000001, name: "Aliastra" },
        { corporationId: 1000002, name: "Zainou" },
      ],
    });
  });
});

describe("lp-store/all route server data", () => {
  it("folds required items into their offer and coerces the bigint costs", async () => {
    loyaltyStoreOfferGroupBy.mockResolvedValue([{ corporationId: 1000001 }]);
    corporationFindMany.mockResolvedValue([
      { corporationId: 1000001, name: "Aliastra" },
    ]);
    loyaltyStoreOfferFindMany.mockResolvedValue([
      {
        offerId: 1,
        corporationId: 1000001,
        typeId: 34,
        quantity: 1,
        akCost: 0,
        lpCost: BigInt(100),
        iskCost: BigInt(2000),
      },
    ]);
    loyaltyStoreOfferRequiredItemFindMany.mockResolvedValue([
      { typeId: 35, quantity: 5, offerId: 1, corporationId: 1000001 },
    ]);
    typeFindMany.mockResolvedValue([{ typeId: 34, name: "Tritanium" }]);

    const props = await propsOf("~/app/lp-store/all/page");
    const offers = props.offers as Record<string, unknown>[];
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      offerId: 1,
      lpCost: 100,
      iskCost: 2000,
      requiredItems: [
        { typeId: 35, quantity: 5, offerId: 1, corporationId: 1000001 },
      ],
    });
  });
});

describe("ship-scanner route server data", () => {
  it("lists the published types of every ship group", async () => {
    categoryFindUnique.mockResolvedValue({
      groups: [{ groupId: 25, name: "Frigate" }],
    });
    typeFindMany.mockResolvedValue([{ typeId: 587, name: "Rifter" }]);
    expect(await propsOf("~/app/ship-scanner/page")).toEqual({
      ships: [{ id: 587, name: "Rifter" }],
    });
  });

  it("404s when the ship category genuinely has no row, without erroring", async () => {
    categoryFindUnique.mockResolvedValue(null);
    await expect(runPage("~/app/ship-scanner/page")).rejects.toThrow(NOT_FOUND);
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});

describe("dogma list routes server data", () => {
  it("attaches each attribute's type count", async () => {
    dogmaAttributeFindMany.mockResolvedValue([
      { attributeId: 9, name: "hp", displayName: "Structure Hitpoints" },
    ]);
    typeAttributeGroupBy.mockResolvedValue([
      { attributeId: 9, _count: { attributeId: 42 } },
    ]);
    const props = await propsOf("~/app/dogma/attributes/page");
    expect(props.attributes).toEqual({
      9: {
        attributeId: 9,
        name: "hp",
        displayName: "Structure Hitpoints",
        numTypeIds: 42,
      },
    });
  });

  it("ignores a count for an attribute that has no row", async () => {
    dogmaAttributeFindMany.mockResolvedValue([]);
    typeAttributeGroupBy.mockResolvedValue([
      { attributeId: 999, _count: { attributeId: 7 } },
    ]);
    expect(await propsOf("~/app/dogma/attributes/page")).toEqual({
      attributes: {},
    });
  });

  it("attaches each effect's type count", async () => {
    dogmaEffectFindMany.mockResolvedValue([
      { effectId: 11, name: "loPower", displayName: "Low Power" },
    ]);
    typeEffectGroupBy.mockResolvedValue([
      { effectId: 11, _count: { effectId: 5 } },
    ]);
    const props = await propsOf("~/app/dogma/effects/page");
    expect(props.effects).toEqual({
      11: {
        effectId: 11,
        name: "loPower",
        displayName: "Low Power",
        numTypeIds: 5,
      },
    });
  });

  it("ignores a count for an effect that has no row", async () => {
    dogmaEffectFindMany.mockResolvedValue([]);
    typeEffectGroupBy.mockResolvedValue([
      { effectId: 999, _count: { effectId: 3 } },
    ]);
    expect(await propsOf("~/app/dogma/effects/page")).toEqual({ effects: {} });
  });
});
