import type { JobDefinition } from "../core";
import { createJobRegistry } from "../core";
import { bootstrapDatabase } from "./bootstrap";
import {
  backfillEveKillAllianceIds,
  backfillEveKillCharacterIds,
  backfillEveKillCorporationIds,
  backfillEveRefKillmails,
  backfillEveRefWars,
  processRedisAllianceIds,
  processRedisCharacterIds,
  processRedisCorporationIds,
  processRedisWars,
  scrapeEsiAlliances,
  scrapeEsiAncestries,
  scrapeEsiBloodlines,
  scrapeEsiCategories,
  scrapeEsiConstellations,
  scrapeEsiCorporations,
  scrapeEsiDogmaAttributes,
  scrapeEsiDogmaEffects,
  scrapeEsiFactions,
  scrapeEsiGraphics,
  scrapeEsiGroups,
  scrapeEsiLoyaltyStoreOffers,
  scrapeEsiMarketGroups,
  scrapeEsiMoons,
  scrapeEsiNpcCorporations,
  scrapeEsiPlanets,
  scrapeEsiRaces,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
  scrapeEsiStargates,
  scrapeEsiStations,
  scrapeEsiTypes,
  scrapeEsiWars,
  scrapeHoboleaksAgentTypes,
  scrapeHoboleaksDogmaEffectCategories,
  scrapeHoboleaksDogmaUnits,
  scrapeSdeAgents,
  scrapeSdeDogmaAttributeCategories,
  scrapeSdeDogmaEffectModifiers,
  scrapeSdeIcons,
  scrapeSdeNpcCorporationDivisions,
  scrapeSdeRaces,
  scrapeSdeStationServices,
  scrapeZkillboardRecentKills,
  updateWars,
} from "./scrape";
import { testPing } from "./test";

/**
 * The full set of platform-agnostic background jobs. The Inngest adapter
 * (`@jitaspace/eve-scrape`) and the Trigger.dev adapter
 * (`@jitaspace/background-jobs-triggerdev`) both build their platform-specific
 * functions/tasks from this single list.
 */
export const jobs: JobDefinition[] = [
  backfillEveKillAllianceIds,
  backfillEveKillCharacterIds,
  backfillEveKillCorporationIds,
  backfillEveRefKillmails,
  backfillEveRefWars,
  bootstrapDatabase,
  processRedisAllianceIds,
  processRedisCharacterIds,
  processRedisCorporationIds,
  processRedisWars,
  scrapeEsiAlliances,
  scrapeEsiAncestries,
  scrapeEsiBloodlines,
  scrapeEsiCategories,
  scrapeEsiConstellations,
  scrapeEsiCorporations,
  scrapeEsiDogmaAttributes,
  scrapeEsiDogmaEffects,
  scrapeEsiFactions,
  scrapeEsiGraphics,
  scrapeEsiGroups,
  scrapeEsiLoyaltyStoreOffers,
  scrapeEsiMarketGroups,
  scrapeEsiMoons,
  scrapeEsiNpcCorporations,
  scrapeEsiPlanets,
  scrapeEsiRaces,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
  scrapeEsiStargates,
  scrapeEsiStations,
  scrapeEsiTypes,
  scrapeEsiWars,
  scrapeHoboleaksAgentTypes,
  scrapeHoboleaksDogmaEffectCategories,
  scrapeHoboleaksDogmaUnits,
  scrapeSdeAgents,
  scrapeSdeDogmaAttributeCategories,
  scrapeSdeDogmaEffectModifiers,
  scrapeSdeIcons,
  scrapeSdeNpcCorporationDivisions,
  scrapeSdeRaces,
  scrapeSdeStationServices,
  scrapeZkillboardRecentKills,
  testPing,
  updateWars,
];

/** Jobs indexed by id, for resolving `ctx.send`/`ctx.invoke` targets. */
export const registry = createJobRegistry(jobs);

export * from "./scrape";
export * from "./test";
export * from "./bootstrap";
