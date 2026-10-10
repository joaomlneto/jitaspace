import type { BackfillEveRefInsurancePricesPayload } from "./backfillInsurancePrices.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { findObservationGaps } from "../../../helpers/insurancePriceBackfill.ts";

/** How far back the sweep looks: long enough to outlast a week-long outage. */
export const GAP_SWEEP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** More gaps than this are sent as one backfill over the whole stretch. */
const MAX_BACKFILLS_PER_SWEEP = 10;

export const fillInsurancePriceGaps = defineJob<Record<string, never>>({
  id: "everef-fill-insurance-price-gaps",
  name: "Fill gaps in the insurance price history",
  // The hourly job sends a backfill when it sees a gap, but only once: a
  // backfill that then fails (EVE Ref rate-limiting us, an outage), or a
  // stretch where the hourly job itself was down, would stay a hole. Once a
  // day, look at the last week again.
  trigger: { type: "cron", cron: "TZ=UTC 23 4 * * *" },
  singleton: true,
  retries: 2,
  description:
    "Send an EVE Ref backfill for every gap of over 90 minutes between insurance price observations in the last week",
  handler: async (ctx) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - GAP_SWEEP_WINDOW_MS);
    const [before, inWindow] = [
      await prisma.insurancePriceSnapshot.findFirst({
        select: { observedAt: true },
        where: { observedAt: { lt: windowStart } },
        orderBy: { observedAt: "desc" },
      }),
      await prisma.insurancePriceSnapshot.findMany({
        select: { observedAt: true },
        where: { observedAt: { gte: windowStart } },
      }),
    ];
    // Without any observation, the history was never bootstrapped: that is a
    // deliberate full backfill, not a gap.
    if (!before && inWindow.length === 0) {
      ctx.logger.warn("No insurance price history to sweep for gaps");
      return { stats: { gaps: 0, backfills: 0 } };
    }

    // The observation before the window bounds a gap that straddles its start.
    const gaps = findObservationGaps(
      [...(before ? [before] : []), ...inWindow].map((row) => row.observedAt),
      now,
    );
    const first = gaps[0];
    const last = gaps.at(-1);
    const backfills =
      gaps.length > MAX_BACKFILLS_PER_SWEEP && first && last
        ? [{ from: first.from, to: last.to }]
        : gaps;
    for (const { from, to } of backfills) {
      await ctx.send<BackfillEveRefInsurancePricesPayload>( // NOSONAR: a handful of sends, in order
        "backfill-everef-insurance-prices",
        { from: from.toISOString(), to: to.toISOString() },
      );
    }
    if (gaps.length > 0) {
      ctx.logger.info("Sent backfills for insurance price gaps", {
        gaps: gaps.map(({ from, to }) => [
          from.toISOString(),
          to.toISOString(),
        ]),
      });
    }
    return { stats: { gaps: gaps.length, backfills: backfills.length } };
  },
});
