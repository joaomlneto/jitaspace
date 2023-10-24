import {
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
  ScrapeSdeRacesEventPayload,
  ScrapeSolarSystemsEventPayload,
  ScrapeStargatesEventPayload,
  ScrapeStationServicesEventPayload,
  ScrapeStationsEventPayload,
  ScrapeTypesEventPayload,
} from "../functions";

export type Events = {
  ping: PingEventPayload;
  "scrape/esi/alliances": ScrapeAlliancesEventPayload;
  "scrape/esi/ancestries": ScrapeAncestriesEventPayload;
  "scrape/esi/bloodlines": ScrapeBloodlinesEventPayload;
  "scrape/esi/categories": ScrapeCategoriesEventPayload;
  "scrape/esi/constellations": ScrapeConstellationEventPayload;
  "scrape/esi/corporations": ScrapeCorporationsEventPayload;
  "scrape/esi/dogma-attributes": ScrapeDogmaAttributesEventPayload;
  "scrape/esi/dogma-effects": ScrapeDogmaEffectsEventPayload;
  "scrape/esi/factions": ScrapeFactionsEventPayload;
  "scrape/esi/graphics": ScrapeGraphicsEventPayload;
  "scrape/esi/groups": ScrapeGroupsEventPayload;
  "scrape/esi/loyalty-store-offers": ScrapeLoyaltyStoreOffersEventPayload;
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/moons": ScrapeMoonsEventPayload;
  "scrape/esi/npc-corporations": ScrapeNpcCorporationsEventPayload;
  "scrape/esi/planets": ScrapePlanetsEventPayload;
  "scrape/esi/races": ScrapeRacesEventPayload;
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/esi/stargates": ScrapeStargatesEventPayload;
  "scrape/esi/stations": ScrapeStationsEventPayload;
  "scrape/esi/types": ScrapeTypesEventPayload;
  "scrape/hoboleaks/agent-types": ScrapeAgentTypesEventPayload;
  "scrape/hoboleaks/dogma-effect-categories": ScrapeDogmaEffectCategoriesEventPayload;
  "scrape/hoboleaks/dogma-units": ScrapeDogmaUnitsEventPayload;
  "scrape/sde/agents": ScrapeAgentsEventPayload;
  "scrape/sde/dogma-attribute-categories": ScrapeDogmaAttributeCategoriesEventPayload;
  "scrape/sde/dogma-units": ScrapeDogmaUnitsEventPayload;
  "scrape/sde/icons": ScrapeIconsEventPayload;
  "scrape/sde/npc-corporation-divisions": ScrapeNpcCorporationDivisionsEventPayload;
  "scrape/sde/races": ScrapeSdeRacesEventPayload;
  "scrape/sde/station-services": ScrapeStationServicesEventPayload;
  "scrape/zkillboard/recent-kills": ScrapeRecentKillsEventPayload;
};
