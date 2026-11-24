import { defineJob } from "../core";
import { SDE_INGEST_JOB_IDS, SDE_POST_ESI_JOB_IDS } from "./scrape";

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
    await ctx.invoke("scrape-hoboleaks-dogma-effect-categories", {});
    await ctx.invoke("scrape-hoboleaks-dogma-units", {});
    await ctx.invoke("scrape-esi-market-groups", {});
    await ctx.invoke("scrape-esi-dogma-attributes", {});
    await ctx.invoke("scrape-esi-dogma-effects", {});

    // Direct SDE-archive ingest pipeline — the full FK-ordered set, shared with
    // the standalone `ingest-sde-all` job. It is the only writer of the static
    // universe tables (types, groups, categories, graphics, the map, stations,
    // factions, races, bloodlines, ancestries): ESI stopped serving them at
    // compatibility date 2026-11-19, so there is no ESI scrape to run first.
    for (const jobId of SDE_INGEST_JOB_IDS) {
      // The NPC corporations go in just before the races. Bloodlines point at
      // a corporation (a real FK), so they cannot be ingested until the
      // corporations exist; the corporations in turn need types (a home
      // station's `typeId`), which are ingested by this point. Anything else a
      // corporation references that is still missing — its CEO's bloodline and
      // race, its faction, its home station — `createCorpAndItsRefRecords`
      // fetches from the SDE itself, and the ingests below then refresh them.
      if (jobId === "ingest-sde-races") {
        await ctx.invoke("scrape-esi-npc-corporations", {});
      }
      // `scrape-sde-agents` is sequenced INTO this list: `Agent.stationId` is a
      // real FK and agents sit in NPC stations, which `ingest-sde-stations`
      // (earlier in this list) fills. It has to come before
      // `ingest-sde-agents-in-space` in turn, which FKs `Agent`.
      if (jobId === "ingest-sde-agents-in-space") {
        await ctx.invoke("scrape-sde-agents", {});
      }
      await ctx.invoke(jobId, {});
    }

    // Loyalty-store offers reference types and corporations, both filled above.
    await ctx.invoke("scrape-esi-loyalty-store-offers", {});

    // SDE jobs that reference ESI-owned tables, so they run last: `Agent` points
    // at Character and Station, both of which the scrapers above and the ingest
    // loop have now filled. Driven from the shared list rather than hardcoded
    // here, so `ingest-sde-all` runs them on every new SDE build too.
    for (const jobId of SDE_POST_ESI_JOB_IDS) {
      await ctx.invoke(jobId, {});
    }

    // Fire-and-forget: kick off the full wars backfill without blocking.
    await ctx.send("scrape-esi-wars", { fetchAllPages: true });
  },
});
