import { cacheLife } from "next/cache";

import type {
  InsurancePricePeriod,
  TypeInsuranceHistory,
} from "~/lib/insurance";
import { prisma } from "~/lib/db";
import { toInsurancePricePeriod } from "~/lib/insurance";

/**
 * A type's latest insurance prices: the current ones, or the last it had if
 * ESI no longer lists it. Null for a type never insurable (anything but a
 * ship). One primary-key lookup, so every item page can afford it.
 *
 * Prices change every couple of days and the job records them hourly, hence
 * `cacheLife("hours")`. A failure throws, so a database blip is never what
 * gets cached; the caller decides how to degrade.
 */
export async function readLatestTypeInsurance(
  typeId: number,
): Promise<InsurancePricePeriod | null> {
  "use cache";
  cacheLife("hours");
  const row = await prisma.insurancePrice.findFirst({
    where: { typeId },
    orderBy: { validFrom: "desc" },
  });
  return row ? toInsurancePricePeriod(row) : null;
}

/** Every price a type has had since the history begins, oldest first. */
export async function readTypeInsuranceHistory(
  typeId: number,
): Promise<TypeInsuranceHistory> {
  "use cache";
  cacheLife("hours");
  // One query at a time keeps this to a single pooled connection.
  const rows = await prisma.insurancePrice.findMany({
    where: { typeId },
    orderBy: { validFrom: "asc" },
  });
  const lastObservation = await prisma.insurancePriceSnapshot.findFirst({
    select: { observedAt: true },
    orderBy: { observedAt: "desc" },
  });
  return {
    periods: rows.map(toInsurancePricePeriod),
    lastObservedAt: lastObservation?.observedAt.toISOString() ?? null,
  };
}
