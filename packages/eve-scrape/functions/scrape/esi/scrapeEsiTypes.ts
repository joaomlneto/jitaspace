import { getUniverseTypes } from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { ScrapeTypesPageEventPayload } from "./scrapeEsiTypesPage";

export type ScrapeTypesEventPayload = {
  data: {};
};

export const scrapeEsiTypes = inngest.createFunction(
  { name: "Scrape Types" },
  { event: "scrape/esi/types" },
  async ({ step, logger }) => {
    // Get all Type IDs in ESI
    const events = await step.run(
      "Fetch number of pages and generate events",
      async () => {
        const firstPage = await getUniverseTypes();
        let typeIds = firstPage.data;
        const numPages = Number(firstPage.headers["x-pages"]);

        const pageNumbers = [...Array(numPages).keys()].map((i) => i + 1);

        return pageNumbers.map(
          (
            page,
          ): ScrapeTypesPageEventPayload & {
            name: "scrape/esi/types-page";
          } => {
            return {
              name: "scrape/esi/types-page",
              data: {
                page,
              },
            };
          },
        );
      },
    );

    events.forEach(async (event) => {
      await step.sleep(`${event.data.page * 10} seconds`);
      await step.sendEvent(event, {
        id: `Fetch page ${event.data.page} of Types`,
      });
    });

    //await step.sendEvent(events);

    return {};
  },
);
