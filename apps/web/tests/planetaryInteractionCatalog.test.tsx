import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import {
  AQUEOUS_LIQUIDS,
  CATALOG,
  colony,
  COMMAND_CENTER,
  NOW,
  pin,
  WATER,
} from "./planetaryInteractionFixtures";

// readPiCatalog reads the schematics and their types from the database; the
// prisma client is stubbed so the shaping and tiering can be driven directly.
// next/cache is stubbed globally, so "use cache" is inert here.
const mockSchematics = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockTypes = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
jest.mock("~/lib/db", () => ({
  prisma: {
    planetSchematic: {
      findMany: (...args: unknown[]) => mockSchematics(...args),
    },
    type: { findMany: (...args: unknown[]) => mockTypes(...args) },
  },
}));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  TypeAvatar: () => null,
  SolarSystemName: () => null,
  TypeName: () => null,
  EveEntityName: () => null,
}));
jest.mock("@jitaspace/hooks", () => ({
  usePlanet: () => ({ data: undefined }),
}));
jest.mock("@jitaspace/ui", () => ({ PlanetName: () => null }));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

describe("readPiCatalog", () => {
  const { readPiCatalog } =
    require("~/app/planetary-interaction/catalog") as typeof import("~/app/planetary-interaction/catalog");

  beforeEach(() => {
    mockSchematics.mockReset().mockResolvedValue([
      {
        planetSchematicId: 121,
        name: "Water",
        cycleTime: 1800,
        types: [
          { typeId: AQUEOUS_LIQUIDS, isInput: true, quantity: 3000 },
          { typeId: WATER, isInput: false, quantity: 20 },
        ],
        pins: [{ pinTypeId: 2473 }],
      },
      {
        planetSchematicId: 999,
        name: "Broken",
        cycleTime: 60,
        types: [{ typeId: 1, isInput: true, quantity: 1 }],
        pins: [],
      },
    ]);
    mockTypes.mockReset().mockResolvedValue([
      {
        typeId: AQUEOUS_LIQUIDS,
        name: "Aqueous Liquids",
        groupId: 1033,
        group: { name: "Planet Liquid-Gas - Raw Materials" },
      },
      {
        typeId: WATER,
        name: "Water",
        groupId: 1042,
        group: { name: "Basic Commodities - Tier 1" },
      },
      {
        typeId: COMMAND_CENTER,
        name: "Barren Command Center",
        groupId: 1027,
        group: { name: "Command Centers" },
      },
    ]);
  });

  it("shapes the schematics into inputs and an output", async () => {
    const catalog = await readPiCatalog();

    expect(catalog.schematics[0]).toEqual({
      schematicId: 121,
      name: "Water",
      cycleTime: 1800,
      inputs: [{ typeId: AQUEOUS_LIQUIDS, quantity: 3000 }],
      output: { typeId: WATER, quantity: 20 },
      pinTypeIds: [2473],
    });
    expect(catalog.schematics[1]?.output).toBeNull();
  });

  it("names and tiers every commodity and pin type", async () => {
    const catalog = await readPiCatalog();

    expect(catalog.types[AQUEOUS_LIQUIDS]?.tier).toBe(0);
    expect(catalog.types[WATER]).toEqual({
      typeId: WATER,
      name: "Water",
      groupId: 1042,
      groupName: "Basic Commodities - Tier 1",
      tier: 1,
    });
    expect(catalog.types[COMMAND_CENTER]?.tier).toBeNull();
  });

  it("asks for the schematics' commodities and the PI pin types", async () => {
    await readPiCatalog();

    expect(mockTypes).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { typeId: { in: [AQUEOUS_LIQUIDS, WATER, 1] } },
            { group: { categoryId: 41 }, published: true },
          ],
        },
      }),
    );
  });

  it("lets a database failure throw rather than caching an empty catalog", async () => {
    mockSchematics.mockRejectedValue(new Error("database down"));

    await expect(readPiCatalog()).rejects.toThrow("database down");
  });
});

describe("PiPageHeader", () => {
  it("marks the current section", () => {
    const { PiPageHeader } =
      require("~/components/PlanetaryInteraction/PiPageHeader") as typeof import("~/components/PlanetaryInteraction/PiPageHeader");
    render(
      <MantineProvider>
        <PiPageHeader active="schematics" title="Schematics" description="d" />
      </MantineProvider>,
    );

    const nav = screen.getByRole("navigation", {
      name: "Planetary Interaction sections",
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schematics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Colonies" })).toHaveAttribute(
      "href",
      "/planetary-interaction",
    );
    expect(screen.getByRole("link", { name: "Colonies" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Schematics" }),
    ).toBeInTheDocument();
  });
});

describe("ColonyDetails", () => {
  const { ColonyDetails } =
    require("~/components/PlanetaryInteraction/ColonyDetails") as typeof import("~/components/PlanetaryInteraction/ColonyDetails");
  const { summarizeColony } =
    require("~/components/PlanetaryInteraction/colonies") as typeof import("~/components/PlanetaryInteraction/colonies");

  it("says what a bare colony lacks", () => {
    const bare = {
      pins: [pin({ type_id: COMMAND_CENTER })],
      links: [],
      routes: [],
    };
    render(
      <MantineProvider>
        <ColonyDetails
          row={{
            ...colony(1, 2),
            key: "1:2",
            layoutState: "ready",
            summary: summarizeColony(bare, CATALOG, NOW),
          }}
          layout={bare}
          catalog={CATALOG}
          now={NOW}
        />
      </MantineProvider>,
    );

    expect(
      screen.getByText("This colony has no extractors."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This colony has no factories."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nothing is stored on this colony."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Structures by kind" }),
    ).toHaveTextContent("Command Center1");
  });

  it("renders nothing for a colony that is not summarised yet", () => {
    render(
      <MantineProvider>
        <ColonyDetails
          row={{ ...colony(1, 2), key: "1:2", layoutState: "loading" }}
          layout={{ pins: [], links: [], routes: [] }}
          catalog={CATALOG}
          now={NOW}
        />
      </MantineProvider>,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
