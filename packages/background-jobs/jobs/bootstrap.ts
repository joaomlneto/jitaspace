import { defineJob } from "../core";
import { SDE_INGEST_JOB_IDS } from "./scrape";

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

    // Direct SDE-archive ingest pipeline — the full FK-ordered set, shared with
    // the standalone `ingest-sde-all` job. These jobs coexist with the scrapers
    // above (the diff machinery only writes the columns each job owns, so SDE
    // and ESI never clobber each other) and also add the tables the scrapers
    // don't cover (celestials, blueprints, certificates, skins, metaGroups,
    // contraband, the planetary / dogma reference tables, etc.).
    for (const jobId of SDE_INGEST_JOB_IDS) {
      await ctx.invoke(jobId, {});
    }

    // Fire-and-forget: kick off the full wars backfill without blocking.
    await ctx.send("scrape-esi-wars", { fetchAllPages: true });
  },
});
