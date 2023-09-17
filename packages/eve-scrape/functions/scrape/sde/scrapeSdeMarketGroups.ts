import { inngest } from "../../../client";

export type ScrapeSdeMarketGroupsEventPayload = {
  data: {};
};

export const scrapeSdeMarketGroups = inngest.createFunction(
  { name: "Scrape Market Groups" },
  { event: "scrape/sde/market-groups" },
  async ({ event, step, logger }) => {
    return "NOT YET IMPLEMENTED";
  },
);
