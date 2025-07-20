import { client } from "../client";

export type BootstrapDatabaseEventPayload = {
  data: {};
};

export const bootstrapDatabase = client.createFunction(
  {
    id: "bootstrap-database",
    name: "Bootstrap Database",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  { event: "bootstrap-database" },
  async ({ step, event, logger }) => {
    await step.sendEvent("Scrape Agent Types", {
      name: "scrape/hoboleaks/agent-types",
      data: {},
    });
    await step.waitForEvent("Wait for Agent Types", {
      event: "scrape/hoboleaks/agent-types.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Dogma Attribute Categories", {
      name: "scrape/sde/dogma-attribute-categories",
      data: {},
    });
    await step.waitForEvent("Wait for Dogma Attribute Categories", {
      event: "scrape/sde/dogma-attribute-categories.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Dogma Effect Categories", {
      name: "scrape/hoboleaks/dogma-effect-categories",
      data: {},
    });
    await step.waitForEvent("Wait for Dogma Effect Categories", {
      event: "scrape/hoboleaks/dogma-effect-categories.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Dogma Units", {
      name: "scrape/hoboleaks/dogma-units",
      data: {},
    });
    await step.waitForEvent("Wait for Dogma Units", {
      event: "scrape/hoboleaks/dogma-units.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Station Services", {
      name: "scrape/sde/station-services",
      data: {},
    });
    await step.waitForEvent("Wait for Station Services", {
      event: "scrape/sde/station-services.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape NPC Corporation Divisions", {
      name: "scrape/sde/npc-corporation-divisions",
      data: {},
    });
    await step.waitForEvent("Wait for NPC Corporation Divisions", {
      event: "scrape/sde/npc-corporation-divisions.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Icons", {
      name: "scrape/sde/icons",
      data: {},
    });
    await step.waitForEvent("Wait for Icons", {
      event: "scrape/sde/icons.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Graphics", {
      name: "scrape/esi/graphics",
      data: {},
    });
    await step.waitForEvent("Wait for Graphics", {
      event: "scrape/esi/graphics.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Market Groups", {
      name: "scrape/esi/market-groups",
      data: {},
    });
    await step.waitForEvent("Wait for Market Groups", {
      event: "scrape/esi/market-groups.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Dogma Attributes", {
      name: "scrape/esi/dogma-attributes",
      data: {},
    });
    await step.waitForEvent("Wait for Dogma Attributes", {
      event: "scrape/esi/dogma-attributes.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Dogma Effects", {
      name: "scrape/esi/dogma-effects",
      data: {},
    });
    await step.waitForEvent("Wait for Dogma Effects", {
      event: "scrape/esi/dogma-effects.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Categories", {
      name: "scrape/esi/categories",
      data: {},
    });
    await step.waitForEvent("Wait for Categories", {
      event: "scrape/esi/categories.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Groups", {
      name: "scrape/esi/groups",
      data: {},
    });
    await step.waitForEvent("Wait for Groups", {
      event: "scrape/esi/groups.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Types", {
      name: "scrape/esi/types",
      data: {},
    });
    await step.waitForEvent("Wait for Types", {
      event: "scrape/esi/types.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Regions", {
      name: "scrape/esi/regions",
      data: {},
    });
    await step.waitForEvent("Wait for Regions", {
      event: "scrape/esi/regions.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Constellations", {
      name: "scrape/esi/constellations",
      data: {},
    });
    await step.waitForEvent("Wait for Constellations", {
      event: "scrape/esi/constellations.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Solar Systems", {
      name: "scrape/esi/solar-systems",
      data: {},
    });
    await step.waitForEvent("Wait for Solar Systems", {
      event: "scrape/esi/solar-systems.finished",
      timeout: "3h",
    });

    await step.sendEvent("Scrape Factions", {
      name: "scrape/esi/factions",
      data: {},
    });

    await step.waitForEvent("Wait for Factions", {
      event: "scrape/esi/factions.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Races from SDE", {
      name: "scrape/sde/races",
      data: {},
    });
    await step.waitForEvent("Wait for Races from SDE", {
      event: "scrape/sde/races.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Races from ESI", {
      name: "scrape/esi/races",
      data: {},
    });
    await step.waitForEvent("Wait for Races from ESI", {
      event: "scrape/esi/races.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Bloodlines", {
      name: "scrape/esi/bloodlines",
      data: {},
    });
    await step.waitForEvent("Wait for Bloodlines", {
      event: "scrape/esi/bloodlines.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Ancestries", {
      name: "scrape/esi/ancestries",
      data: {},
    });
    await step.waitForEvent("Wait Ancestries", {
      event: "scrape/esi/ancestries.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape NPC Corporations", {
      name: "scrape/esi/npc-corporations",
      data: {},
    });
    await step.waitForEvent("Wait NPC Corporations", {
      event: "scrape/esi/npc-corporations.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Agents", {
      name: "scrape/sde/agents",
      data: {},
    });
    await step.waitForEvent("Wait Agents", {
      event: "scrape/sde/agents.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape Research Agents", {
      name: "scrape/sde/research-agents",
      data: {},
    });
    await step.waitForEvent("Wait Research Agents", {
      event: "scrape/sde/research-agents.finished",
      timeout: "1h",
    });

    await step.sendEvent("Scrape LP Store Offers", {
      name: "scrape/esi/loyalty-store-offers",
      data: {},
    });
    await step.waitForEvent("Wait for LP Store Offers", {
      event: "scrape/esi/loyalty-store-offers.finished",
      timeout: "1h",
    });

    // And a few fire-and-forget events to kick off other scrapes
    await step.sendEvent("Scrape All Wars", {
      name: "scrape/esi/wars",
      data: {
        fetchAllPages: true,
      },
    });
  },
);
