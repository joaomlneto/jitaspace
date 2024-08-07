import {
  BootstrapDatabaseEventPayload,
  PingEventPayload,
  ScrapeAgentsEventPayload,
  ScrapeAgentTypesEventPayload,
  ScrapeAlliancesEventPayload,
  ScrapeAncestriesEventPayload,
  ScrapeBloodlinesEventPayload,
  ScrapeCategoriesEventPayload,
  ScrapeConstellationEventPayload,
  ScrapeCorporationsEventPayload,
  ScrapeDogmaAttributeCategoriesEventPayload,
  ScrapeDogmaAttributesEventPayload,
  ScrapeDogmaEffectCategoriesEventPayload,
  ScrapeDogmaEffectModifiersEventPayload,
  ScrapeDogmaEffectsEventPayload,
  ScrapeDogmaUnitsEventPayload,
  ScrapeFactionsEventPayload,
  ScrapeGraphicsEventPayload,
  ScrapeGroupsEventPayload,
  ScrapeIconsEventPayload,
  ScrapeLoyaltyStoreOffersEventPayload,
  ScrapeMarketGroupsEventPayload,
  ScrapeMoonsEventPayload,
  ScrapeNpcCorporationDivisionsEventPayload,
  ScrapeNpcCorporationsEventPayload,
  ScrapePlanetsEventPayload,
  ScrapeRacesEventPayload,
  ScrapeRecentKillsEventPayload,
  ScrapeRegionEventPayload,
  ScrapeResearchAgentsEventPayload,
  ScrapeSdeRacesEventPayload,
  ScrapeSolarSystemsEventPayload,
  ScrapeStargatesEventPayload,
  ScrapeStationServicesEventPayload,
  ScrapeStationsEventPayload,
  ScrapeTypesEventPayload,
} from "../functions";

export type Events = {
  "bootstrap-database": BootstrapDatabaseEventPayload;
  ping: PingEventPayload;
  "scrape/esi/alliances": ScrapeAlliancesEventPayload;
  "scrape/esi/alliances.finished": {};
  "scrape/esi/ancestries": ScrapeAncestriesEventPayload;
  "scrape/esi/ancestries.finished": {};
  "scrape/esi/bloodlines": ScrapeBloodlinesEventPayload;
  "scrape/esi/bloodlines.finished": {};
  "scrape/esi/categories": ScrapeCategoriesEventPayload;
  "scrape/esi/categories.finished": {};
  "scrape/esi/constellations": ScrapeConstellationEventPayload;
  "scrape/esi/constellations.finished": {};
  "scrape/esi/corporations": ScrapeCorporationsEventPayload;
  "scrape/esi/corporations.finished": {};
  "scrape/esi/dogma-attributes": ScrapeDogmaAttributesEventPayload;
  "scrape/esi/dogma-attributes.finished": {};
  "scrape/esi/dogma-effects": ScrapeDogmaEffectsEventPayload;
  "scrape/esi/dogma-effects.finished": {};
  "scrape/esi/factions": ScrapeFactionsEventPayload;
  "scrape/esi/factions.finished": {};
  "scrape/esi/graphics": ScrapeGraphicsEventPayload;
  "scrape/esi/graphics.finished": {};
  "scrape/esi/groups": ScrapeGroupsEventPayload;
  "scrape/esi/groups.finished": {};
  "scrape/esi/loyalty-store-offers": ScrapeLoyaltyStoreOffersEventPayload;
  "scrape/esi/loyalty-store-offers.finished": {};
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/market-groups.finished": {};
  "scrape/esi/moons": ScrapeMoonsEventPayload;
  "scrape/esi/moons.finished": {};
  "scrape/esi/npc-corporations": ScrapeNpcCorporationsEventPayload;
  "scrape/esi/npc-corporations.finished": {};
  "scrape/esi/planets": ScrapePlanetsEventPayload;
  "scrape/esi/planets.finished": {};
  "scrape/esi/races": ScrapeRacesEventPayload;
  "scrape/esi/races.finished": {};
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/regions.finished": {};
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/esi/solar-systems.finished": {};
  "scrape/esi/stargates": ScrapeStargatesEventPayload;
  "scrape/esi/stargates.finished": {};
  "scrape/esi/stations": ScrapeStationsEventPayload;
  "scrape/esi/stations.finished": {};
  "scrape/esi/types": ScrapeTypesEventPayload;
  "scrape/esi/types.finished": {};
  "scrape/hoboleaks/agent-types": ScrapeAgentTypesEventPayload;
  "scrape/hoboleaks/agent-types.finished": {};
  "scrape/hoboleaks/dogma-effect-categories": ScrapeDogmaEffectCategoriesEventPayload;
  "scrape/hoboleaks/dogma-effect-categories.finished": {};
  "scrape/hoboleaks/dogma-units": ScrapeDogmaUnitsEventPayload;
  "scrape/hoboleaks/dogma-units.finished": {};
  "scrape/sde/agents": ScrapeAgentsEventPayload;
  "scrape/sde/agents.finished": {};
  "scrape/sde/dogma-attribute-categories": ScrapeDogmaAttributeCategoriesEventPayload;
  "scrape/sde/dogma-attribute-categories.finished": {};
  "scrape/sde/dogma-effect-modifiers": ScrapeDogmaEffectModifiersEventPayload;
  "scrape/sde/dogma-effect-modifiers.finished": {};
  "scrape/sde/icons": ScrapeIconsEventPayload;
  "scrape/sde/icons.finished": {};
  "scrape/sde/npc-corporation-divisions": ScrapeNpcCorporationDivisionsEventPayload;
  "scrape/sde/npc-corporation-divisions.finished": {};
  "scrape/sde/races": ScrapeSdeRacesEventPayload;
  "scrape/sde/races.finished": {};
  "scrape/sde/research-agents": ScrapeResearchAgentsEventPayload;
  "scrape/sde/research-agents.finished": {};
  "scrape/sde/station-services": ScrapeStationServicesEventPayload;
  "scrape/sde/station-services.finished": {};
  "scrape/zkillboard/recent-kills": ScrapeRecentKillsEventPayload;
};
