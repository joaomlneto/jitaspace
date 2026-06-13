import { registry } from "@jitaspace/background-jobs";

import { toTriggerTask } from "../adapter";

// One literal named export per job — required so the Trigger.dev build can
// statically index each task. Generated from the @jitaspace/background-jobs
// registry; keep in sync if jobs are added or removed.
export const backfillEvekillAllianceIdsTask = toTriggerTask(registry.get("backfill-evekill-alliance-ids"));
export const backfillEvekillCharacterIdsTask = toTriggerTask(registry.get("backfill-evekill-character-ids"));
export const backfillEvekillCorporationIdsTask = toTriggerTask(registry.get("backfill-evekill-corporation-ids"));
export const backfillEverefKillmailsTask = toTriggerTask(registry.get("backfill-everef-killmails"));
export const backfillEverefWarsTask = toTriggerTask(registry.get("backfill-everef-wars"));
export const bootstrapDatabaseTask = toTriggerTask(registry.get("bootstrap-database"));
export const esiUpdateWarsTask = toTriggerTask(registry.get("esi-update-wars"));
export const pingTask = toTriggerTask(registry.get("ping"));
export const processRedisAllianceIdsTask = toTriggerTask(registry.get("process-redis-alliance-ids"));
export const processRedisCharacterIdsTask = toTriggerTask(registry.get("process-redis-character-ids"));
export const processRedisCorporationIdsTask = toTriggerTask(registry.get("process-redis-corporation-ids"));
export const processRedisWarsTask = toTriggerTask(registry.get("process-redis-wars"));
export const scrapeEsiAlliancesTask = toTriggerTask(registry.get("scrape-esi-alliances"));
export const scrapeEsiAncestriesTask = toTriggerTask(registry.get("scrape-esi-ancestries"));
export const scrapeEsiBloodlinesTask = toTriggerTask(registry.get("scrape-esi-bloodlines"));
export const scrapeEsiCategoriesTask = toTriggerTask(registry.get("scrape-esi-categories"));
export const scrapeEsiConstellationsTask = toTriggerTask(registry.get("scrape-esi-constellations"));
export const scrapeEsiCorporationsTask = toTriggerTask(registry.get("scrape-esi-corporations"));
export const scrapeEsiDogmaAttributesTask = toTriggerTask(registry.get("scrape-esi-dogma-attributes"));
export const scrapeEsiDogmaEffectsTask = toTriggerTask(registry.get("scrape-esi-dogma-effects"));
export const scrapeEsiFactionsTask = toTriggerTask(registry.get("scrape-esi-factions"));
export const scrapeEsiGraphicsTask = toTriggerTask(registry.get("scrape-esi-graphics"));
export const scrapeEsiGroupsTask = toTriggerTask(registry.get("scrape-esi-groups"));
export const scrapeEsiLoyaltyStoreOffersTask = toTriggerTask(registry.get("scrape-esi-loyalty-store-offers"));
export const scrapeEsiMarketGroupsTask = toTriggerTask(registry.get("scrape-esi-market-groups"));
export const scrapeEsiMoonsTask = toTriggerTask(registry.get("scrape-esi-moons"));
export const scrapeEsiNpcCorporationsTask = toTriggerTask(registry.get("scrape-esi-npc-corporations"));
export const scrapeEsiPlanetsTask = toTriggerTask(registry.get("scrape-esi-planets"));
export const scrapeEsiRacesTask = toTriggerTask(registry.get("scrape-esi-races"));
export const scrapeEsiRegionsTask = toTriggerTask(registry.get("scrape-esi-regions"));
export const scrapeEsiSolarSystemsTask = toTriggerTask(registry.get("scrape-esi-solar-systems"));
export const scrapeEsiStargatesTask = toTriggerTask(registry.get("scrape-esi-stargates"));
export const scrapeEsiStationsTask = toTriggerTask(registry.get("scrape-esi-stations"));
export const scrapeEsiTypesTask = toTriggerTask(registry.get("scrape-esi-types"));
export const scrapeEsiWarsTask = toTriggerTask(registry.get("scrape-esi-wars"));
export const scrapeHoboleaksAgentTypesTask = toTriggerTask(registry.get("scrape-hoboleaks-agent-types"));
export const scrapeHoboleaksDogmaEffectCategoriesTask = toTriggerTask(registry.get("scrape-hoboleaks-dogma-effect-categories"));
export const scrapeHoboleaksDogmaUnitsTask = toTriggerTask(registry.get("scrape-hoboleaks-dogma-units"));
export const scrapeSdeAgentsTask = toTriggerTask(registry.get("scrape-sde-agents"));
export const scrapeSdeDogmaAttributeCategoriesTask = toTriggerTask(registry.get("scrape-sde-dogma-attribute-categories"));
export const scrapeSdeDogmaEffectModifiersTask = toTriggerTask(registry.get("scrape-sde-dogma-effect-modifiers"));
export const scrapeSdeIconsTask = toTriggerTask(registry.get("scrape-sde-icons"));
export const scrapeSdeNpcCorporationDivisionsTask = toTriggerTask(registry.get("scrape-sde-npc-corporation-divisions"));
export const scrapeSdeRacesTask = toTriggerTask(registry.get("scrape-sde-races"));
export const scrapeSdeStationServicesTask = toTriggerTask(registry.get("scrape-sde-station-services"));
export const scrapeZkillboardRecentKillsTask = toTriggerTask(registry.get("scrape-zkillboard-recent-kills"));
