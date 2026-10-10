import type { InsurancePriceSource } from "@jitaspace/db";

import type { InsurancePriceValues } from "./planInsurancePriceUpdates.ts";
import { prisma } from "../db";
import { planInsurancePriceUpdates } from "./planInsurancePriceUpdates.ts";

export interface InsurancePriceObservation {
  observedAt: Date;
  source: InsurancePriceSource;
  prices: ReadonlyMap<number, InsurancePriceValues>;
  /**
   * Later observations of the very same list (EVE Ref's hourly files between
   * two price changes), recorded as snapshots only. Each must come before the
   * next observation already recorded after `observedAt`, so that no recorded
   * observation sits between them and this one.
   */
  repeatedAt?: readonly Date[];
}

export interface InsurancePriceRecordResult {
  /** False when an observation at `observedAt` was already recorded. */
  recorded: boolean;
  /** Types whose prices differ from those current before `observedAt`. */
  changedTypes: number;
  /** Snapshot rows written. */
  snapshots: number;
}

const notRecorded: InsurancePriceRecordResult = {
  recorded: false,
  changedTypes: 0,
  snapshots: 0,
};

/**
 * Record one observation of the insurance price list: its snapshot row(s), and
 * the InsurancePrice rows it starts, ends or splits. One transaction, so a
 * retry starts clean; recording the same observation twice is a no-op.
 */
export async function recordInsurancePriceSnapshot({
  observedAt,
  source,
  prices,
  repeatedAt = [],
}: InsurancePriceObservation): Promise<InsurancePriceRecordResult> {
  return prisma.$transaction(
    async (tx) => {
      // One query at a time: a transaction holds a single connection.
      const existing = await tx.insurancePriceSnapshot.findUnique({
        select: { observedAt: true },
        where: { observedAt },
      });
      if (existing) return notRecorded;

      const next = await tx.insurancePriceSnapshot.findFirst({
        select: { observedAt: true },
        where: { observedAt: { gt: observedAt } },
        orderBy: { observedAt: "asc" },
      });
      const nextObservedAt = next?.observedAt ?? null;
      const repeated = repeatedAt.filter((at) => at > observedAt);
      if (
        repeated.length !== repeatedAt.length ||
        (nextObservedAt !== null && repeated.some((at) => at >= nextObservedAt))
      ) {
        throw new Error(
          "Repeated insurance price observations must fall between this one and the next recorded",
        );
      }

      const containing = await tx.insurancePrice.findMany({
        where: {
          validFrom: { lte: observedAt },
          OR: [{ validUntil: null }, { validUntil: { gt: observedAt } }],
        },
      });
      const startingAtNext =
        nextObservedAt === null
          ? []
          : await tx.insurancePrice.findMany({
              where: { validFrom: nextObservedAt },
            });

      const plan = planInsurancePriceUpdates({
        observedAt,
        prices,
        containing,
        nextObservedAt,
        startingAtNext,
      });

      // Close before creating: a split creates a row of a closed type.
      if (plan.closeTypeIds.length > 0) {
        await tx.insurancePrice.updateMany({
          where: {
            typeId: { in: plan.closeTypeIds },
            validFrom: { lte: observedAt },
            OR: [{ validUntil: null }, { validUntil: { gt: observedAt } }],
          },
          data: { validUntil: observedAt },
        });
      }
      if (plan.deleteAtNextTypeIds.length > 0 && nextObservedAt !== null) {
        await tx.insurancePrice.deleteMany({
          where: {
            typeId: { in: plan.deleteAtNextTypeIds },
            validFrom: nextObservedAt,
          },
        });
      }
      if (plan.create.length > 0) {
        await tx.insurancePrice.createMany({ data: plan.create });
      }
      const snapshots = [observedAt, ...repeated].map((at) => ({
        observedAt: at,
        source,
        typeCount: prices.size,
      }));
      await tx.insurancePriceSnapshot.createMany({ data: snapshots });

      return {
        recorded: true,
        changedTypes: plan.changedTypeIds.length,
        snapshots: snapshots.length,
      };
    },
    // Prisma's 5s default is tight for a remote database and a change that
    // rewrites every type's row.
    { maxWait: 10_000, timeout: 60_000 },
  );
}
