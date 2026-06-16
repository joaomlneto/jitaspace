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
 * On-demand, end-to-end SDE ingest: runs every `ingest-sde-*` job in FK
 * dependency order, each as its own (retryable) child task, populating a fresh
 * database or updating an existing one — the per-file ingests are diff-based and
 * idempotent. Unlike `bootstrapDatabase` this runs ONLY the SDE pipeline (no
 * ESI / hoboleaks scrapers), so it is the job to run to "pull the latest SDE
 * into the database".
 *
 * Each child downloads the SDE archive independently (separate task runs don't
 * share a filesystem), so a full run fetches it once per file — acceptable for a
 * periodic sync; a shared download is the obvious future optimization. Switch
 * `trigger` to `{ type: "cron", cron: "0 12 * * 1" }` to run it on a schedule.
 */
export const ingestSde = defineJob<IngestSdeEventPayload["data"]>({
  id: "ingest-sde-all",
  name: "Ingest SDE (full sync)",
  description:
    "Download the latest EVE Online SDE and populate/update every SDE-derived table, in dependency order. Each file is ingested by its own retryable child job.",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    for (const jobId of SDE_INGEST_JOB_IDS) {
      await ctx.invoke(jobId, {});
    }
  },
});
