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

/** Attempts at a transaction CockroachDB aborts as a write conflict. */
const CONFLICT_ATTEMPTS = 3;

/**
 * A serializable transaction CockroachDB aborted (SQLSTATE 40001), which Prisma
 * reports as P2034: running it again is the documented fix.
 */
export const isWriteConflict = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2034";

/**
 * Record one observation of the insurance price list: its snapshot row(s), and
 * the InsurancePrice rows it starts, ends or splits. One transaction, so a
 * retry starts clean; recording the same observation twice is a no-op.
 *
 * The hourly job and a backfill both rewrite the current rows when prices
 * change, so a run that overlaps the other can be aborted as a write conflict.
 * That is retried here, rather than failing a backfill's whole attempt.
 */
export async function recordInsurancePriceSnapshot(
  observation: InsurancePriceObservation,
): Promise<InsurancePriceRecordResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await recordOnce(observation); // NOSONAR: a retry needs the previous attempt to have failed
    } catch (error) {
      if (!isWriteConflict(error) || attempt >= CONFLICT_ATTEMPTS) throw error;
    }
  }
}

async function recordOnce({
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

      // Close before creating: a split creates a row of a closed type. By
      // primary key: a range on `validFrom` would read every type's history.
      const closeTypeIds = new Set(plan.closeTypeIds);
      const closing = containing.filter((row) => closeTypeIds.has(row.typeId));
      if (closing.length > 0) {
        await tx.insurancePrice.updateMany({
          where: {
            OR: closing.map(({ typeId, validFrom }) => ({ typeId, validFrom })),
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
