import { defineJob } from "../../../core";

/**
 * Every `ingest-sde-*` job id, in foreign-key dependency order:
 * graphics/icons/marketGroups before types; categories → groups → types;
 * dogma-units/categories → dogma-attributes → dogma-effects; types before their
 * child tables; certificates before masteries; skinMaterials → skins →
 * skinLicenses; factions before contraband; races → bloodlines → ancestries;
 * regions → constellations → solarSystems → {stars, stargates, planets} →
 * {moons, asteroidBelts} → stations.
 *
 * Shared by {@link ingestSde} (the standalone pipeline) and `bootstrapDatabase`
 * (which runs the same set after the API scrapers). Adding a new `ingest-sde-*`
 * job? Add its id here too — `registry.test.ts` asserts this list stays exactly
 * the set of `ingest-sde-*` jobs (minus this orchestrator).
 */
export const SDE_INGEST_JOB_IDS: string[] = [
  // Reference lookups (no or already-satisfied dependencies).
  "ingest-sde-graphics",
  "ingest-sde-icons",
  "ingest-sde-market-groups",
  "ingest-sde-meta-groups",
  "ingest-sde-categories",
  "ingest-sde-groups",
  "ingest-sde-dogma-attribute-categories",
  "ingest-sde-dogma-units",
  "ingest-sde-dogma-attributes",
  "ingest-sde-dogma-effects",
  "ingest-sde-agent-types",
  "ingest-sde-station-services",
  "ingest-sde-npc-corporation-divisions",
  "ingest-sde-station-operations",
  // Types and type-keyed data.
  "ingest-sde-types",
  "ingest-sde-factions",
  "ingest-sde-type-dogma",
  "ingest-sde-type-materials",
  "ingest-sde-type-bonus",
  "ingest-sde-type-lists",
  "ingest-sde-compressible-types",
  "ingest-sde-blueprints",
  "ingest-sde-certificates",
  "ingest-sde-masteries",
  "ingest-sde-skin-materials",
  "ingest-sde-skins",
  "ingest-sde-skin-licenses",
  "ingest-sde-contraband-types",
  "ingest-sde-control-tower-resources",
  "ingest-sde-dynamic-item-attributes",
  "ingest-sde-dbuff-collections",
  "ingest-sde-sovereignty-upgrades",
  // Races / bloodlines / ancestries.
  "ingest-sde-races",
  "ingest-sde-bloodlines",
  "ingest-sde-ancestries",
  // Universe / celestials.
  "ingest-sde-regions",
  "ingest-sde-constellations",
  "ingest-sde-solar-systems",
  "ingest-sde-stars",
  "ingest-sde-stargates",
  "ingest-sde-planets",
  "ingest-sde-moons",
  "ingest-sde-asteroid-belts",
  "ingest-sde-stations",
  "ingest-sde-map-secondary-suns",
  "ingest-sde-planet-resources",
  "ingest-sde-planet-schematics",
  // Agents in space.
  "ingest-sde-agents-in-space",
  // Misc reference data (no cross-entity foreign keys).
  "ingest-sde-corporation-activities",
  "ingest-sde-mercenary-tactical-operations",
  "ingest-sde-freelance-job-schemas",
  "ingest-sde-dungeons",
  "ingest-sde-clone-grades",
  "ingest-sde-character-attributes",
  "ingest-sde-character-titles",
  "ingest-sde-archetypes",
  "ingest-sde-landmarks",
  "ingest-sde-translation-languages",
];

export interface IngestSdeEventPayload {
  data: Record<string, never>;
}

/**
 * On-demand, end-to-end SDE ingest: downloads the latest SDE ONCE and runs every
 * `ingest-sde-*` job in FK dependency order, all within this single task — so the
 * ~97MB archive is fetched a single time (`loadSdeFile` caches the extract per
 * process). Populates a fresh database or updates an existing one (the per-file
 * ingests are diff-based, chunked, and idempotent). Unlike `bootstrapDatabase`
 * this runs ONLY the SDE pipeline (no ESI / hoboleaks scrapers), so it is the job
 * to run to "pull the latest SDE into the database".
 *
 * Because everything runs in one task there is no per-file retry: a failure fails
 * the whole sync, which then retries from the start (re-downloading once,
 * re-diffing — cheap, since the ingests are idempotent). The individual
 * `ingest-sde-*` tasks remain available for targeted re-runs. Assumes the non-SDE
 * tables some SDE rows reference (e.g. `Corporation`, which bloodlines point at)
 * already exist — run the ESI scrapers / `bootstrapDatabase` first on an empty
 * database. Switch `trigger` to `{ type: "cron", cron: "0 12 * * 1" }` to run it
 * on a schedule.
 */
export const ingestSde = defineJob<IngestSdeEventPayload["data"]>({
  id: "ingest-sde-all",
  name: "Ingest SDE (full sync)",
  description:
    "Download the latest EVE Online SDE once and populate/update every SDE-derived table, in dependency order, within a single task.",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 1,
  // Generous cap for the whole in-process pipeline; raise if a full run nears it.
  maxDurationSeconds: 3600,
  // Running every ingest in one process peaks around ~1.3 GB (the type/dogma and
  // moons sections), so it needs a roomy machine — the default presets OOM-kill
  // it. 4 GB gives V8 headroom to GC under the working set; bump to large-1x if a
  // future SDE grows it further.
  machine: "medium-2x",
  handler: async (ctx) => {
    // Run every ingest in THIS process (not as child tasks) so the SDE archive
    // is downloaded only once. The lazy import breaks the module cycle (the
    // registry is built from the jobs array, which includes this job) and is
    // resolved at run time, after the graph is fully loaded.
    const { registry } = await import("../../index");
    const results: Record<string, unknown> = {};
    for (const jobId of SDE_INGEST_JOB_IDS) {
      ctx.logger.info(`ingest-sde-all: ${jobId}`);
      results[jobId] = await registry.get(jobId).handler(ctx);
    }
    return { results };
  },
});
