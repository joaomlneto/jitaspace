import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// The type, system and character routes resolve their SDE half on the server and
// hand it to the client page as props. Each resolver is module-private, so these
// tests drive it the way Next does: call the route's default export, then resolve
// the async `PageContent` child inside its Suspense boundary. The client page is
// stubbed to capture the props it receives.

type Row = Record<string, unknown> | null;

const solarSystemFindUnique = jest.fn<(args?: unknown) => Promise<Row>>();
const agentFindUnique = jest.fn<(args?: unknown) => Promise<Row>>();
const researchSkillsFindMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();
const typeFindUniqueOrThrow = jest.fn<(args?: unknown) => Promise<Row>>();
const typeAttributeFindMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    solarSystem: { findUnique: (a?: unknown) => solarSystemFindUnique(a) },
    agent: { findUnique: (a?: unknown) => agentFindUnique(a) },
    researchAgentSkills: {
      findMany: (a?: unknown) => researchSkillsFindMany(a),
    },
    type: { findUniqueOrThrow: (a?: unknown) => typeFindUniqueOrThrow(a) },
    typeAttribute: { findMany: (a?: unknown) => typeAttributeFindMany(a) },
  },
}));

// `getTypeData` is a "use cache" function; cacheLife is a no-op here.
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

jest.mock("@jitaspace/esi-client", () => ({
  getCharactersDetail: jest.fn(() =>
    Promise.resolve({ data: { name: "Test" } }),
  ),
}));

jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));

// Each client page is replaced by a stub; the assertions read the props off the
// element the server half produced, so the stub itself renders nothing.
const probe = () => null;
jest.mock("~/app/type/[typeId]/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/system/[systemId]/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/character/[characterId]/page.client", () => ({
  __esModule: true,
  default: probe,
}));

/**
 * Run a route's server half: call `Page`, then resolve the async child inside
 * its Suspense boundary and return the props it passed to the client page.
 */
async function runRoute(
  modulePath: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const Page = (
    require(modulePath) as {
      default: (p: { params: Promise<Record<string, string>> }) => ReactElement<{
        children: ReactElement;
      }>;
    }
  ).default;
  const tree = Page({ params: Promise.resolve(params) });
  const child = tree.props.children;
  const resolved = await (child.type as (p: unknown) => Promise<ReactElement>)(
    child.props,
  );
  // The resolved element is <Probe {...props} />; read the props straight off it.
  return resolved.props as Record<string, unknown>;
}

beforeEach(() => {
  solarSystemFindUnique.mockReset();
  agentFindUnique.mockReset();
  researchSkillsFindMany.mockReset().mockResolvedValue([]);
  typeFindUniqueOrThrow.mockReset();
  typeAttributeFindMany.mockReset().mockResolvedValue([]);
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ status: 200, json: () => Promise.resolve([]) }),
  ) as unknown as typeof globalThis.fetch;
});

describe("system route server data", () => {
  const columns = {
    luminosity: 1.5,
    radius: 100,
    wormholeClassId: null,
    positionX: 1,
    positionY: 2,
    positionZ: 3,
    factionId: 500001,
    isHub: true,
    isBorder: null,
    isFringe: false,
    isCorridor: null,
    isInternational: true,
    isRegional: null,
  };

  it("maps the SDE columns onto the client prop, folding position into one object", async () => {
    solarSystemFindUnique.mockResolvedValue(columns);

    const props = await runRoute("~/app/system/[systemId]/page", {
      systemId: "30000142",
    });

    expect(props.sde).toEqual({
      luminosity: 1.5,
      radius: 100,
      wormholeClassId: null,
      position: { x: 1, y: 2, z: 3 },
      factionId: 500001,
      // Null flags normalize to false — FlagChip takes a plain boolean.
      isHub: true,
      isBorder: false,
      isFringe: false,
      isCorridor: false,
      isInternational: true,
      isRegional: false,
    });
  });

  it("reports a null position when a coordinate is missing", async () => {
    solarSystemFindUnique.mockResolvedValue({ ...columns, positionZ: null });

    const props = await runRoute("~/app/system/[systemId]/page", {
      systemId: "30000142",
    });

    expect((props.sde as { position: unknown }).position).toBeNull();
  });

  it("passes null for an unknown system", async () => {
    solarSystemFindUnique.mockResolvedValue(null);
    const props = await runRoute("~/app/system/[systemId]/page", {
      systemId: "30000142",
    });
    expect(props.sde).toBeNull();
  });

  it("passes null for a non-numeric id without querying", async () => {
    const props = await runRoute("~/app/system/[systemId]/page", {
      systemId: "not-a-number",
    });
    expect(props.sde).toBeNull();
    expect(solarSystemFindUnique).not.toHaveBeenCalled();
  });

  it("passes null when the query fails", async () => {
    solarSystemFindUnique.mockRejectedValue(new Error("connection lost"));
    const props = await runRoute("~/app/system/[systemId]/page", {
      systemId: "30000142",
    });
    expect(props.sde).toBeNull();
  });
});

describe("character route server data", () => {
  const agentRow = {
    agentTypeId: 2,
    agentDivisionId: 22,
    isLocator: true,
    level: 4,
    stationId: 60000001,
    AgentDivision: { name: "Distribution" },
    Character: { corporationId: 1000035 },
    agentsInSpace: [],
  };

  it("passes null for a character with no agent record", async () => {
    agentFindUnique.mockResolvedValue(null);
    const props = await runRoute("~/app/character/[characterId]/page", {
      characterId: "90000001",
    });
    expect(props.agentData).toBeNull();
    expect(props.agentDivisionName).toBeNull();
  });

  it("maps an ordinary agent, skipping the research-skills query", async () => {
    agentFindUnique.mockResolvedValue(agentRow);

    const props = await runRoute("~/app/character/[characterId]/page", {
      characterId: "3019582",
    });

    expect(props.agentDivisionName).toBe("Distribution");
    expect(props.agentData).toMatchObject({
      agentTypeId: 2,
      agentDivisionId: 22,
      corporationId: 1000035,
      isLocator: true,
      level: 4,
      locationId: 60000001,
      isResearchAgent: false,
      researchSkills: [],
      inSpace: null,
    });
    // Only agent type 4 offers datacores, so the second query is skipped.
    expect(researchSkillsFindMany).not.toHaveBeenCalled();
  });

  it("loads datacore skills for a research agent and folds in its in-space row", async () => {
    agentFindUnique.mockResolvedValue({
      ...agentRow,
      agentTypeId: 4,
      agentsInSpace: [
        { dungeonId: 1, solarSystemId: 30000142, spawnPointId: 2, typeId: 3 },
      ],
    });
    researchSkillsFindMany.mockResolvedValue([
      { typeId: 11487 },
      { typeId: 11488 },
    ]);

    const props = await runRoute("~/app/character/[characterId]/page", {
      characterId: "3019582",
    });

    expect(props.agentData).toMatchObject({
      isResearchAgent: true,
      researchSkills: [11487, 11488],
      inSpace: {
        dungeonId: 1,
        solarSystemId: 30000142,
        spawnPointId: 2,
        typeId: 3,
      },
    });
  });

  it("passes null when the query fails", async () => {
    agentFindUnique.mockRejectedValue(new Error("connection lost"));
    const props = await runRoute("~/app/character/[characterId]/page", {
      characterId: "3019582",
    });
    expect(props.agentData).toBeNull();
  });
});

describe("type route dogma metadata", () => {
  beforeEach(() => {
    typeFindUniqueOrThrow.mockResolvedValue({
      typeId: 587,
      name: "Rifter",
      description: "A frigate.",
    });
  });

  it("builds the attribute, unit and category maps from one query", async () => {
    typeAttributeFindMany.mockResolvedValue([
      {
        attributeId: 9,
        attribute: {
          displayName: "Structure Hitpoints",
          name: "hp",
          iconId: 1389,
          unitId: 113,
          attributeCategoryId: 7,
          DogmaUnit: { displayName: "HP", name: "hitpoints" },
          attributeCategory: { name: "Armor" },
        },
      },
    ]);

    const props = await runRoute("~/app/type/[typeId]/page", {
      typeId: "587",
    });

    expect(props.dogmaMeta).toEqual({
      attributes: {
        9: {
          displayName: "Structure Hitpoints",
          name: "hp",
          iconId: 1389,
          unitId: 113,
          categoryId: 7,
        },
      },
      unitSymbols: { 113: "HP" },
      categoryNames: { 7: "Armor" },
    });
  });

  it("falls back to the unit's plain name when its symbol is blank", async () => {
    typeAttributeFindMany.mockResolvedValue([
      {
        attributeId: 9,
        attribute: {
          displayName: null,
          name: "hp",
          iconId: null,
          unitId: 113,
          attributeCategoryId: null,
          DogmaUnit: { displayName: "  ", name: "hitpoints" },
          attributeCategory: null,
        },
      },
    ]);

    const props = await runRoute("~/app/type/[typeId]/page", {
      typeId: "587",
    });

    const meta = props.dogmaMeta as {
      attributes: Record<number, { displayName?: string }>;
      unitSymbols: Record<number, string>;
      categoryNames: Record<number, string>;
    };
    expect(meta.unitSymbols).toEqual({ 113: "hitpoints" });
    // A blank displayName must not leak through as an empty string.
    expect(meta.attributes[9]?.displayName).toBeUndefined();
    expect(meta.categoryNames).toEqual({});
  });

  it("omits a unit entry when the attribute has no unit", async () => {
    typeAttributeFindMany.mockResolvedValue([
      {
        attributeId: 9,
        attribute: {
          displayName: "Mass",
          name: "mass",
          iconId: null,
          unitId: null,
          attributeCategoryId: null,
          DogmaUnit: null,
          attributeCategory: null,
        },
      },
    ]);

    const props = await runRoute("~/app/type/[typeId]/page", {
      typeId: "587",
    });

    expect((props.dogmaMeta as { unitSymbols: unknown }).unitSymbols).toEqual(
      {},
    );
  });

  it("degrades to empty metadata when the query fails", async () => {
    typeAttributeFindMany.mockRejectedValue(new Error("connection lost"));

    const props = await runRoute("~/app/type/[typeId]/page", {
      typeId: "587",
    });

    expect(props.dogmaMeta).toEqual({
      attributes: {},
      unitSymbols: {},
      categoryNames: {},
    });
  });
});
