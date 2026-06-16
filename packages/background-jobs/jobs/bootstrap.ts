import { defineJob } from "../core";

export interface BootstrapDatabaseEventPayload {
  data: Record<string, never>;
}

export const bootstrapDatabase = defineJob<
  BootstrapDatabaseEventPayload["data"]
>({
  id: "bootstrap-database",
  name: "Bootstrap Database",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    // Populate the database in dependency order. Each `invoke` blocks until the
    // child job completes before the next starts (previously a sendEvent +
    // waitForEvent pair per child). A child failure now propagates and fails
    // bootstrap at that step, instead of silently timing out after 1-3h.
    await ctx.invoke("scrape-hoboleaks-agent-types", {});
    await ctx.invoke("scrape-sde-dogma-attribute-categories", {});
    await ctx.invoke("scrape-hoboleaks-dogma-effect-categories", {});
    await ctx.invoke("scrape-hoboleaks-dogma-units", {});
    await ctx.invoke("scrape-sde-station-services", {});
    await ctx.invoke("scrape-sde-npc-corporation-divisions", {});
    await ctx.invoke("scrape-sde-icons", {});
    await ctx.invoke("scrape-esi-graphics", {});
    await ctx.invoke("scrape-esi-market-groups", {});
    await ctx.invoke("scrape-esi-dogma-attributes", {});
    await ctx.invoke("scrape-esi-dogma-effects", {});
    await ctx.invoke("scrape-esi-categories", {});
    await ctx.invoke("scrape-esi-groups", {});
    await ctx.invoke("scrape-esi-types", {});
    await ctx.invoke("scrape-esi-regions", {});
    await ctx.invoke("scrape-esi-constellations", {});
    await ctx.invoke("scrape-esi-solar-systems", {});
    await ctx.invoke("scrape-esi-factions", {});
    await ctx.invoke("scrape-sde-races", {});
    await ctx.invoke("scrape-esi-races", {});
    await ctx.invoke("scrape-esi-bloodlines", {});
    await ctx.invoke("scrape-esi-ancestries", {});
    await ctx.invoke("scrape-esi-npc-corporations", {});
    await ctx.invoke("scrape-sde-agents", {});
    await ctx.invoke("scrape-esi-loyalty-store-offers", {});

    // Direct SDE-archive ingest pipeline. These jobs coexist with the scrapers
    // above (the diff machinery only writes the columns each job owns, so SDE
    // and ESI never clobber each other) and also add the tables the scrapers
    // don't cover (celestials, blueprints, certificates, skins, metaGroups,
    // contraband, the planetary / dogma reference tables, etc.). Ordered so the
    // block is FK-consistent on its own: graphics/icons/marketGroups before
    // types; regions → constellations → solarSystems → celestials; parents
    // before their child tables.
    await ctx.invoke("ingest-sde-graphics", {});
    await ctx.invoke("ingest-sde-icons", {});
    await ctx.invoke("ingest-sde-market-groups", {});
    await ctx.invoke("ingest-sde-meta-groups", {});
    await ctx.invoke("ingest-sde-categories", {});
    await ctx.invoke("ingest-sde-groups", {});
    await ctx.invoke("ingest-sde-dogma-attribute-categories", {});
    await ctx.invoke("ingest-sde-dogma-units", {});
    await ctx.invoke("ingest-sde-dogma-attributes", {});
    await ctx.invoke("ingest-sde-dogma-effects", {});
    await ctx.invoke("ingest-sde-agent-types", {});
    await ctx.invoke("ingest-sde-station-services", {});
    await ctx.invoke("ingest-sde-npc-corporation-divisions", {});
    await ctx.invoke("ingest-sde-station-operations", {});

    await ctx.invoke("ingest-sde-types", {});
    await ctx.invoke("ingest-sde-factions", {});
    await ctx.invoke("ingest-sde-type-dogma", {});
    await ctx.invoke("ingest-sde-type-materials", {});
    await ctx.invoke("ingest-sde-type-bonus", {});
    await ctx.invoke("ingest-sde-type-lists", {});
    await ctx.invoke("ingest-sde-compressible-types", {});
    await ctx.invoke("ingest-sde-blueprints", {});
    await ctx.invoke("ingest-sde-certificates", {});
    await ctx.invoke("ingest-sde-masteries", {});
    await ctx.invoke("ingest-sde-skin-materials", {});
    await ctx.invoke("ingest-sde-skins", {});
    await ctx.invoke("ingest-sde-skin-licenses", {});
    await ctx.invoke("ingest-sde-contraband-types", {});
    await ctx.invoke("ingest-sde-control-tower-resources", {});
    await ctx.invoke("ingest-sde-dynamic-item-attributes", {});
    await ctx.invoke("ingest-sde-dbuff-collections", {});
    await ctx.invoke("ingest-sde-sovereignty-upgrades", {});

    await ctx.invoke("ingest-sde-races", {});
    await ctx.invoke("ingest-sde-bloodlines", {});
    await ctx.invoke("ingest-sde-ancestries", {});

    await ctx.invoke("ingest-sde-regions", {});
    await ctx.invoke("ingest-sde-constellations", {});
    await ctx.invoke("ingest-sde-solar-systems", {});
    await ctx.invoke("ingest-sde-stars", {});
    await ctx.invoke("ingest-sde-stargates", {});
    await ctx.invoke("ingest-sde-planets", {});
    await ctx.invoke("ingest-sde-moons", {});
    await ctx.invoke("ingest-sde-asteroid-belts", {});
    await ctx.invoke("ingest-sde-stations", {});
    await ctx.invoke("ingest-sde-map-secondary-suns", {});
    await ctx.invoke("ingest-sde-planet-resources", {});
    await ctx.invoke("ingest-sde-planet-schematics", {});

    await ctx.invoke("ingest-sde-agents-in-space", {});

    await ctx.invoke("ingest-sde-corporation-activities", {});
    await ctx.invoke("ingest-sde-mercenary-tactical-operations", {});
    await ctx.invoke("ingest-sde-freelance-job-schemas", {});
    await ctx.invoke("ingest-sde-dungeons", {});
    await ctx.invoke("ingest-sde-clone-grades", {});
    await ctx.invoke("ingest-sde-character-attributes", {});
    await ctx.invoke("ingest-sde-character-titles", {});
    await ctx.invoke("ingest-sde-archetypes", {});
    await ctx.invoke("ingest-sde-landmarks", {});
    await ctx.invoke("ingest-sde-translation-languages", {});

    // Fire-and-forget: kick off the full wars backfill without blocking.
    await ctx.send("scrape-esi-wars", { fetchAllPages: true });
  },
});
