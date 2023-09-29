import {
  PingEventPayload,
  ScrapeAlliancesEventPayload,
  ScrapeAncestriesEventPayload,
  ScrapeBloodlinesEventPayload,
  ScrapeCategoriesEventPayload,
  ScrapeConstellationEventPayload,
  ScrapeCorporationsEventPayload,
  ScrapeDogmaAttributesEventPayload,
  ScrapeDogmaEffectsEventPayload,
  ScrapeFactionsEventPayload,
  ScrapeGroupsEventPayload,
  ScrapeLoyaltyStoreOffersEventPayload,
  ScrapeMarketGroupsEventPayload,
  ScrapeMoonsEventPayload,
  ScrapeNpcCorporationsEventPayload,
  ScrapePlanetsEventPayload,
  ScrapeRacesEventPayload,
  ScrapeRegionEventPayload,
  ScrapeSolarSystemsEventPayload,
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
  "scrape/esi/groups": ScrapeGroupsEventPayload;
  "scrape/esi/loyalty-store-offers": ScrapeLoyaltyStoreOffersEventPayload;
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/moons": ScrapeMoonsEventPayload;
  "scrape/esi/npc-corporations": ScrapeNpcCorporationsEventPayload;
  "scrape/esi/planets": ScrapePlanetsEventPayload;
  "scrape/esi/races": ScrapeRacesEventPayload;
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/esi/types": ScrapeTypesEventPayload;
};
