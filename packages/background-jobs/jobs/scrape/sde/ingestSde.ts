import * as fs from "node:fs";

import { sdeInputFiles } from "@jitaspace/sde-utils";

import { defineJob } from "../../../core";
// Imported from the module, not the helpers barrel: the barrel pulls in
// ESM-only deps that jest cannot load, and this job has unit tests.
import { loadSdeFile, sdeExtractRoot } from "../../../helpers/loadSdeFile";
import {
  recordSdeIngestCompleted,
  recordSdeIngestStarted,
  sdeBuildFromMetadata,
} from "./sdeIngestState";

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
  // Ship-tree elements/groups and graphic material sets come FIRST: they are the
  // targets of Type.shipTreeGroupId and Graphic.sofMaterialSetId, both real
  // foreign keys, so they must exist before types/graphics are written.
  "ingest-sde-ship-tree-elements",
  "ingest-sde-ship-tree-groups",
  "ingest-sde-graphic-material-sets",
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
  // Derived from dogmaEffects.yaml's nested modifierInfo; its optional FKs point
  // at DogmaEffect / DogmaAttribute / Group, all ingested above.
  "ingest-sde-dogma-effect-modifiers",
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
  // Remaining ship-tree tables. Elements/groups/material sets already ran at the
  // top of this list; these two only need shipTreeElements, which has too.
  "ingest-sde-ship-tree-factions",
  "ingest-sde-type-elements",
  // Missions and epic arcs. EpicArcMission FKs Mission, so missions come first.
  "ingest-sde-missions",
  "ingest-sde-epic-arcs",
  // Military campaigns. Objectives FK the campaign.
  "ingest-sde-military-campaigns",
  "ingest-sde-military-campaign-objectives",
  // SKINR. Categories/rarities before point values and components; slots before
  // slot configurations; ship-tree groups (above) before tier thresholds.
  "ingest-sde-skinr-component-categories",
  "ingest-sde-skinr-component-rarities",
  "ingest-sde-skinr-component-point-values",
  "ingest-sde-skinr-components",
  "ingest-sde-skinr-slot-categories",
  "ingest-sde-skinr-slot-names",
  "ingest-sde-skinr-slots",
  "ingest-sde-skinr-slot-configurations",
  "ingest-sde-skinr-tier-thresholds",
  // Misc reference data (no cross-entity foreign keys).
  "ingest-sde-corporation-activities",
  // Only writes SDE-owned columns onto Corporation rows the ESI scrapers have
  // already created, so it must follow them — never creates a corporation.
  "ingest-sde-npc-corporations",
  "ingest-sde-mercenary-tactical-operations",
  "ingest-sde-freelance-job-schemas",
  "ingest-sde-dungeons",
  "ingest-sde-clone-grades",
  "ingest-sde-character-attributes",
  "ingest-sde-character-titles",
  "ingest-sde-archetypes",
  "ingest-sde-landmarks",
  "ingest-sde-translation-languages",
  // The 23 files CCP added in SDE build 3475087 (2026-08-20). Every cross-file
  // id in this batch is a plain column rather than a real foreign key (see the
  // section comment in schema.prisma), so none of these jobs depends on another
  // one's table — the grouping below is for readability only. Parent/child
  // tables fed by the SAME file (expert systems, schools, the assembly-line
  // details) are ordered inside their own handler.
  "ingest-sde-accounting-entry-types",
  "ingest-sde-notification-types",
  "ingest-sde-corporation-role-groups",
  "ingest-sde-corporation-roles",
  "ingest-sde-expert-systems",
  "ingest-sde-fighter-abilities",
  "ingest-sde-fighter-abilities-by-type",
  "ingest-sde-industry-activities",
  "ingest-sde-industry-target-filters",
  "ingest-sde-industry-assembly-lines",
  "ingest-sde-industry-installation-types",
  "ingest-sde-industry-modifier-sources",
  "ingest-sde-schools",
  "ingest-sde-school-map",
  "ingest-sde-skill-plans",
  "ingest-sde-skinr-slots-to-materials",
  "ingest-sde-station-standings-restrictions",
  "ingest-sde-applied-proximity-effects",
  "ingest-sde-proximity-trap",
  "ingest-sde-system-dbuff-emitters",
  "ingest-sde-system-wide-effects",
  "ingest-sde-link-with-ship",
  "ingest-sde-metenox-moon-drill",
];

/**
 * SDE-derived jobs that must run AFTER the ESI scrapers, because the tables they
 * write reference ESI-owned rows.
 *
 * These cannot live in {@link SDE_INGEST_JOB_IDS}: that list is asserted to be
 * exactly the `ingest-sde-*` set (see `tests/registry.test.ts`), and these jobs
 * keep a `scrape-` id precisely because they are hybrids. Keeping them in their
 * own list rather than as a hardcoded line in `bootstrapDatabase` is what makes
 * them reachable from `ingest-sde-all` too — without it, a new SDE build
 * refreshed every table EXCEPT these, which is how the `Agent` table came to sit
 * untouched from 2024-07-03 while every other SDE table was current.
 */
export const SDE_POST_ESI_JOB_IDS: string[] = [
  // npcCharacters.yaml -> Agent / ResearchAgent / NpcCharacterSkill, plus the
  // SDE-owned columns on the ESI-owned Character rows. Needs Character and
  // Station to exist, so it runs after the ESI scrapers and after the ingest
  // loop that fills Station.
  "scrape-sde-agents",
];

export interface IngestSdeEventPayload {
  data: Record<string, never>;
}

/**
 * On-demand, end-to-end SDE ingest: downloads the latest SDE ONCE and runs every
 * `ingest-sde-*` job in FK dependency order — then the `SDE_POST_ESI_JOB_IDS`
 * hybrids, which need ESI-owned tables — all within this single task, so the
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
    // Claim the marker before any table is touched, so `watch-sde` stops
    // re-triggering while this run is in flight. Reading `_sde.yaml` also warms
    // the per-process extract every ingest below reuses, so this is the same
    // single download, not an extra one.
    const build = sdeBuildFromMetadata(await loadSdeFile("_sde.yaml"));
    await recordSdeIngestStarted(build);
    ctx.logger.info(`ingest-sde-all: SDE build ${build.buildNumber}`);

    // Nothing else in the pipeline ever compares the archive against the
    // registry: `loadFile` is registry-first and throws only for a file we ASK
    // for, so a file CCP *removes* fails loudly while a file CCP *adds* is
    // silent. Build 3475087 added 23 files that went unnoticed until someone
    // diffed the zip by hand. The extract is already on disk here (reading
    // `_sde.yaml` above warmed it), so this costs one readdir.
    // Diagnostic only, so it must never be what fails a 45-minute run: an
    // unreadable extract is reported and stepped over, not thrown.
    try {
      const known = new Set(Object.keys(sdeInputFiles));
      const present = fs
        .readdirSync(await sdeExtractRoot())
        .filter((name) => name.endsWith(".yaml"));
      const unknown = present.filter((name) => !known.has(name));
      const absent = [...known].filter((name) => !present.includes(name));
      if (unknown.length > 0 || absent.length > 0) {
        ctx.logger.warn("SDE registry drift", { unknown, absent });
      }
    } catch (error) {
      ctx.logger.warn("SDE registry drift check skipped", {
        error: String(error),
      });
    }

    // Run every ingest in THIS process (not as child tasks) so the SDE archive
    // is downloaded only once. The lazy import breaks the module cycle (the
    // registry is built from the jobs array, which includes this job) and is
    // resolved at run time, after the graph is fully loaded.
    const { registry } = await import("../../index");
    const results: Record<string, unknown> = {};
    for (const jobId of [...SDE_INGEST_JOB_IDS, ...SDE_POST_ESI_JOB_IDS]) {
      ctx.logger.info(`ingest-sde-all: ${jobId}`);
      results[jobId] = await registry.get(jobId).handler(ctx);
    }

    // Only now is the database actually on this build. A failure above leaves
    // the claim un-completed, which `watch-sde` retries once it goes stale.
    await recordSdeIngestCompleted(build.buildNumber);
    return { results, buildNumber: build.buildNumber };
  },
});
