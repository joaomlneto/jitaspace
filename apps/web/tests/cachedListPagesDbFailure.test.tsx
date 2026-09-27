import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

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
// scope — so nothing wrong is written to the cache and the route recovers with
// the database — and must never be converted into `notFound()`. There is a case
// per Prisma read, not per route: covering only the first read of each page
// would let the defect back in through any of the later ones.
//
// The success cases exist to prove the reads still map onto the props the client
// pages expect.
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
// The anchors keep their entity id in a data attribute so the tests can assert
// where a link points, not merely that a label rendered.
jest.mock("@jitaspace/ui", () => ({
  CategoryAnchor: ({
    categoryId,
    children,
  }: {
    categoryId?: number;
    children?: React.ReactNode;
  }) => <span data-entity-id={categoryId}>{children}</span>,
}));
jest.mock("@jitaspace/eve-components", () => ({
  RegionAnchor: ({
    regionId,
    children,
  }: {
    regionId?: number;
    children?: React.ReactNode;
  }) => <span data-entity-id={regionId}>{children}</span>,
}));

// AgentsTable renders nothing, so capture the props it was handed instead —
// otherwise the /agents mapping and sort would be asserted by nothing.
let agentsTableProps: Record<string, unknown> | null = null;
const probe = () => null;
jest.mock("~/components/Agents", () => ({
  AgentsTable: (p: Record<string, unknown>) => {
    agentsTableProps = p;
    return null;
  },
}));
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
  agentsTableProps = null;
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

// EVERY Prisma read on these routes, not just the first one each. A catch
// reintroduced around any single read must fail this suite — covering only the
// first read would let the defect back in through the later ones.
describe("a database failure never becomes a cached 404", () => {
  const cases: { route: string; read: string; fail: () => void }[] = [
    {
      route: "/categories",
      read: "category.findMany",
      fail: () => categoryFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/regions",
      read: "region.findMany",
      fail: () => regionFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/agents",
      read: "agent.findMany",
      fail: () => agentFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/agents",
      read: "agentType.findMany",
      fail: () => agentTypeFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/agents",
      read: "npcCorporationDivision.findMany",
      fail: () =>
        npcCorporationDivisionFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/skills",
      read: "group.findMany",
      fail: () => groupFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store",
      read: "loyaltyStoreOffer.groupBy",
      fail: () => loyaltyStoreOfferGroupBy.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store",
      read: "corporation.findMany",
      fail: () => corporationFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store/all",
      read: "loyaltyStoreOffer.groupBy",
      fail: () => loyaltyStoreOfferGroupBy.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store/all",
      read: "corporation.findMany",
      fail: () => corporationFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store/all",
      read: "loyaltyStoreOffer.findMany",
      fail: () => loyaltyStoreOfferFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/lp-store/all",
      read: "loyaltyStoreOfferRequiredItem.findMany",
      fail: () =>
        loyaltyStoreOfferRequiredItemFindMany.mockRejectedValue(
          new Error(BLIP),
        ),
    },
    {
      route: "/lp-store/all",
      read: "type.findMany",
      fail: () => typeFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/ship-scanner",
      read: "category.findUnique",
      fail: () => categoryFindUnique.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/ship-scanner",
      read: "type.findMany",
      fail: () => typeFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/attributes",
      read: "dogmaAttribute.findMany",
      fail: () => dogmaAttributeFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/attributes",
      read: "typeAttribute.groupBy",
      fail: () => typeAttributeGroupBy.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/effects",
      read: "dogmaEffect.findMany",
      fail: () => dogmaEffectFindMany.mockRejectedValue(new Error(BLIP)),
    },
    {
      route: "/dogma/effects",
      read: "typeEffect.groupBy",
      fail: () => typeEffectGroupBy.mockRejectedValue(new Error(BLIP)),
    },
  ];

  const MODULES: Record<string, string> = {
    "/categories": "~/app/categories/page",
    "/regions": "~/app/regions/page",
    "/agents": "~/app/agents/page",
    "/skills": "~/app/skills/page",
    "/lp-store": "~/app/lp-store/page",
    "/lp-store/all": "~/app/lp-store/all/page",
    "/ship-scanner": "~/app/ship-scanner/page",
    "/dogma/attributes": "~/app/dogma/attributes/page",
    "/dogma/effects": "~/app/dogma/effects/page",
  };

  it("enumerates every Prisma read on the nine routes", () => {
    // Guards the guard: if a route gains a read, this count fails and whoever
    // added it has to decide whether it needs a case here.
    expect(cases).toHaveLength(19);
  });

  it.each(cases)(
    "$route propagates a failure of $read instead of 404ing",
    async ({ route, fail }) => {
      fail();
      await expect(runPage(MODULES[route]!)).rejects.toThrow(BLIP);
      expect(notFound).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------
// Success paths — the reads still produce the props the client pages expect.
// ---------------------------------------------------------------------------

describe("categories route server data", () => {
  it("links each category name to its own id, in query order", async () => {
    categoryFindMany.mockResolvedValue([
      { categoryId: 6, name: "Ship" },
      { categoryId: 7, name: "Module" },
    ]);
    const { container } = render(
      <MantineProvider>
        {await runPage("~/app/categories/page")}
      </MantineProvider>,
    );
    expect(
      [...container.querySelectorAll("[data-entity-id]")].map((a) => [
        a.getAttribute("data-entity-id"),
        a.textContent,
      ]),
    ).toEqual([
      ["6", "Ship"],
      ["7", "Module"],
    ]);
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
    const { container } = render(
      <MantineProvider>{await runPage("~/app/regions/page")}</MantineProvider>,
    );

    // Walk the rendered tree in document order and attribute each region to the
    // galaxy heading above it — asserting the bucketing itself, not merely that
    // every name appears somewhere on the page.
    const GALAXIES = new Set([
      "New Eden (K-Space)",
      "Anoikis (W-Space)",
      "Abyssal",
      "Other",
    ]);
    const bucketed: Record<string, string[]> = {};
    let current = "";
    for (const el of container.querySelectorAll("h3,[data-entity-id]")) {
      const text = el.textContent;
      if (GALAXIES.has(text)) {
        current = text;
        bucketed[current] = [];
      } else if (el.hasAttribute("data-entity-id")) {
        bucketed[current]?.push(text);
      }
    }

    expect(bucketed).toEqual({
      "New Eden (K-Space)": ["The Forge"],
      "Anoikis (W-Space)": ["A-R00001"],
      Abyssal: ["Abyssal One"],
      Other: ["Oddball"],
    });
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
    agentTypeFindMany.mockResolvedValue([{ agentTypeId: 1, name: "Basic" }]);
    npcCorporationDivisionFindMany.mockResolvedValue([
      { npcCorporationDivisionId: 2, name: "Security" },
    ]);

    const tree = await runPage("~/app/agents/page");
    render(<MantineProvider>{tree}</MantineProvider>);

    // Aria sorts before Zed even though the query returned Zed first, and the
    // nested Character relation is flattened onto each row. Both are pinned
    // here because this is the one non-mechanical rewrite in the change:
    // `agents = agents.sort(...)` became an in-place `agents.sort(...)`.
    expect(agentsTableProps?.agents).toEqual([
      {
        characterId: 1,
        name: "Aria",
        corporationId: 1000001,
        agentTypeId: 2,
        agentDivisionId: 1,
        isLocator: true,
        level: 1,
        stationId: 60000001,
      },
      {
        characterId: 2,
        name: "Zed",
        corporationId: 1000002,
        agentTypeId: 1,
        agentDivisionId: 2,
        isLocator: false,
        level: 3,
        stationId: 60000004,
      },
    ]);
    expect(agentsTableProps?.agentTypes).toEqual([
      { agentTypeId: 1, name: "Basic" },
    ]);
    expect(agentsTableProps?.agentDivisions).toEqual([
      { npcCorporationDivisionId: 2, name: "Security" },
    ]);
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
