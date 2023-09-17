import {
  PingEventPayload,
  ScrapeCategoriesEventPayload,
  ScrapeConstellationEventPayload,
  ScrapeDogmaAttributesEventPayload,
  ScrapeGroupsEventPayload,
  ScrapeMarketGroupsEventPayload,
  ScrapeRegionEventPayload,
  ScrapeSdeMarketGroupsEventPayload,
  ScrapeSolarSystemsEventPayload,
  ScrapeTypesEventPayload,
  ScrapeTypesPageEventPayload,
} from "../functions";

export type Events = {
  ping: PingEventPayload;
  "scrape/esi/categories": ScrapeCategoriesEventPayload;
  "scrape/esi/constellations": ScrapeConstellationEventPayload;
  "scrape/esi/dogma-attributes": ScrapeDogmaAttributesEventPayload;
  "scrape/esi/groups": ScrapeGroupsEventPayload;
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/esi/types": ScrapeTypesEventPayload;
  "scrape/esi/types-page": ScrapeTypesPageEventPayload;
  "scrape/sde/market-groups": ScrapeSdeMarketGroupsEventPayload;
};
