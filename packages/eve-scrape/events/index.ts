import {
  PingEventPayload,
  ScrapeCategoriesEventPayload,
  ScrapeConstellationEventPayload,
  ScrapeDogmaAttributesEventPayload,
  ScrapeDogmaEffectsEventPayload,
  ScrapeGroupsEventPayload,
  ScrapeMarketGroupsEventPayload,
  ScrapeRegionEventPayload,
  ScrapeSdeMarketGroupsEventPayload,
  ScrapeSolarSystemsEventPayload,
  ScrapeTypesEventPayload,
} from "../functions";

export type Events = {
  ping: PingEventPayload;
  "scrape/esi/categories": ScrapeCategoriesEventPayload;
  "scrape/esi/constellations": ScrapeConstellationEventPayload;
  "scrape/esi/dogma-attributes": ScrapeDogmaAttributesEventPayload;
  "scrape/esi/dogma-effects": ScrapeDogmaEffectsEventPayload;
  "scrape/esi/groups": ScrapeGroupsEventPayload;
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/esi/types": ScrapeTypesEventPayload;
  "scrape/sde/market-groups": ScrapeSdeMarketGroupsEventPayload;
};
