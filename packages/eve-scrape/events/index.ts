import {
  PingEventPayload,
  ScrapeConstellationEventPayload,
  ScrapeMarketGroupsEventPayload,
  ScrapeRegionEventPayload,
  ScrapeSdeMarketGroupsEventPayload,
  ScrapeSolarSystemsEventPayload,
} from "../functions";

export type Events = {
  ping: PingEventPayload;
  "scrape/esi/constellations": ScrapeConstellationEventPayload;
  "scrape/esi/market-groups": ScrapeMarketGroupsEventPayload;
  "scrape/esi/regions": ScrapeRegionEventPayload;
  "scrape/esi/solar-systems": ScrapeSolarSystemsEventPayload;
  "scrape/sde/market-groups": ScrapeSdeMarketGroupsEventPayload;
};
