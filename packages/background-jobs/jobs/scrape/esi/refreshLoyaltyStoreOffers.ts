import { defineJob } from "../../../core";

export interface RefreshLoyaltyStoreOffersEventPayload {
  data: Record<string, never>;
}

/**
 * Daily trigger for `scrape-esi-loyalty-store-offers`, after downtime, when
 * CCP changes LP stores.
 *
 * Until this existed only `bootstrap-database` ran that scrape, so the offers
 * were never refreshed after the first load: offers CCP removed stayed on the
 * site for months. A trigger of its own rather than a cron on the scrape, so
 * the scrape stays an event job that bootstrap can `invoke` and that can be run
 * by hand for a few `corporationIds`.
 */
export const refreshLoyaltyStoreOffers = defineJob<
  RefreshLoyaltyStoreOffersEventPayload["data"]
>({
  id: "esi-refresh-loyalty-store-offers",
  name: "Refresh LP store offers from ESI",
  description:
    "Daily, after downtime: triggers scrape-esi-loyalty-store-offers for every NPC corporation.",
  trigger: { type: "cron", cron: "TZ=UTC 0 12 * * *" },
  singleton: true,
  handler: async (ctx) => {
    await ctx.send("scrape-esi-loyalty-store-offers", {});
    return { triggered: "scrape-esi-loyalty-store-offers" };
  },
});
