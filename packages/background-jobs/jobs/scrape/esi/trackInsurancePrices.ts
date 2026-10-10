import { getInsurancePrices } from "@jitaspace/esi-client";

import type { BackfillEveRefInsurancePricesPayload } from "../everef/backfillInsurancePrices.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  observedAtFromLastModified,
  parseInsurancePriceList,
} from "../../../helpers/planInsurancePriceUpdates.ts";
import { recordInsurancePriceSnapshot } from "../../../helpers/recordInsurancePriceSnapshot.ts";

/** A hung ESI request fails fast, so a retry runs well before the next poll. */
const ESI_TIMEOUT_MS = 30_000;

/**
 * A gap longer than this since the last observation (an outage, failed runs,
 * the stretch between the bootstrap and the first deploy) is filled from EVE
 * Ref's hourly archive. ESI refreshes the list hourly, so consecutive
 * observations are about an hour apart, and 90 minutes means one went missing.
 */
export const GAP_TO_BACKFILL_MS = 90 * 60 * 1000;

export const trackInsurancePrices = defineJob<Record<string, never>>({
  id: "esi-track-insurance-prices",
  name: "Track insurance prices from ESI",
  // ESI caches GET /insurance/prices for an hour, so polling more often sees
  // nothing new. One request per run against the insurance group's 150 per
  // 15 minutes.
  trigger: { type: "cron", cron: "TZ=UTC 7 * * * *" },
  singleton: true,
  // The write is one transaction, so a retry starts clean.
  retries: 2,
  description:
    "Poll ESI's insurance price list and record which prices changed, keeping the history",
  handler: async (ctx) => {
    const now = new Date();
    const response = await getInsurancePrices(undefined, {
      // Level names are localized; they are stored by their English name.
      acceptLanguage: "en",
      signal: AbortSignal.timeout(ESI_TIMEOUT_MS),
    });
    const prices = parseInsurancePriceList(response.data);
    if (prices.size === 0) {
      // A failed response, not every ship losing its insurance: retry.
      throw new Error("ESI listed no insurance prices");
    }
    const observedAt = observedAtFromLastModified(
      response.headers["last-modified"],
      now,
    );

    const previous = await prisma.insurancePriceSnapshot.findFirst({
      select: { observedAt: true },
      where: { observedAt: { lt: observedAt } },
      orderBy: { observedAt: "desc" },
    });

    const result = await recordInsurancePriceSnapshot({
      observedAt,
      source: "esi",
      prices,
    });

    // Without any previous observation, the history has not been bootstrapped:
    // that is a deliberate full backfill, not a gap.
    const gapMs = previous
      ? observedAt.getTime() - previous.observedAt.getTime()
      : 0;
    if (result.recorded && previous && gapMs > GAP_TO_BACKFILL_MS) {
      ctx.logger.warn("Gap since the last insurance price observation", {
        from: previous.observedAt.toISOString(),
        to: observedAt.toISOString(),
      });
      await ctx.send<BackfillEveRefInsurancePricesPayload>(
        "backfill-everef-insurance-prices",
        {
          from: previous.observedAt.toISOString(),
          to: observedAt.toISOString(),
        },
      );
    }

    return {
      stats: {
        observedAt: observedAt.toISOString(),
        recorded: result.recorded,
        types: prices.size,
        changedTypes: result.changedTypes,
        gapFilled: result.recorded && gapMs > GAP_TO_BACKFILL_MS,
      },
    };
  },
});
