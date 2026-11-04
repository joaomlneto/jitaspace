/**
 * Writes the contract timeline that `contractTimeline.ts` plans. Each region's
 * listing is applied in one transaction, and every statement is idempotent
 * (inserts skip stored contracts, reopens and ends only touch rows still in the
 * other state), so a retry repeats only what had not landed.
 */
import type { Prisma } from "../db";
import type {
  ContractEnd,
  ContractEndReason,
  OutstandingContract,
  RegionHistory,
} from "./contractTimeline";
import type { ContractRow } from "./publicContracts";
import { prisma } from "../db";
import { planRegionListing } from "./contractTimeline";

const CHUNK = 5000;

const chunks = <T>(xs: readonly T[], size = CHUNK) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};
const iso = (ms: number) => new Date(ms).toISOString();

/** One region's listing as ESI gave it. */
export interface RegionListing {
  regionId: number;
  /** Epoch ms: the listing's Last-Modified. */
  observedAt: number;
  /** Every contract listed, as a Contract row. */
  contracts: ContractRow[];
}

export interface AppliedListing {
  regionId: number;
  /** Already applied, or older than a listing that was. */
  skipped: boolean;
  complete: boolean;
  inserted: number[];
  reopened: number[];
  ended: { contractId: number; reason: ContractEndReason | null }[];
  /** The region's history after this listing (unchanged if skipped). */
  history: RegionHistory | null;
}

const outstandingOf = async (
  tx: Prisma.TransactionClient,
  regionId: number,
): Promise<OutstandingContract[]> =>
  (
    await tx.$queryRaw<
      { contractId: number; dateExpired: Date; lastSeenAt: Date }[]
    >`SELECT "contractId", "dateExpired", COALESCE("lastSeenAt", "firstSeenAt", "dateIssued") AS "lastSeenAt"
      FROM "Contract" WHERE "regionId" = ${regionId} AND "isDeleted" = false`
  ).map((c) => ({
    contractId: c.contractId,
    dateExpired: c.dateExpired.getTime(),
    lastSeenAt: c.lastSeenAt.getTime(),
  }));

/** New contracts, first and last seen in this listing; returns those inserted. */
const insertContracts = async (
  tx: Prisma.TransactionClient,
  rows: ContractRow[],
  observedAt: number,
) => {
  const inserted: number[] = [];
  for (const r of chunks(rows)) {
    const ids = await tx.$queryRaw<{ contractId: number }[]>`
      INSERT INTO "Contract" ("contractId", type, "issuerId", "issuerCorporationId", "forCorporation", title,
        "dateIssued", "dateExpired", "daysToComplete", volume, "startLocationId", "endLocationId", "regionId",
        "solarSystemId", "stationId", price, reward, collateral, buyout, "firstSeenAt", "lastSeenAt",
        "isDeleted", "createdAt", "updatedAt")
      SELECT id, t::"ContractType", iss, corp, fc, title, issued AT TIME ZONE 'UTC', expired AT TIME ZONE 'UTC',
        days, vol, sl, el, reg, sys, st, price, reward, coll, buyout,
        ${iso(observedAt)}::timestamptz AT TIME ZONE 'UTC', ${iso(observedAt)}::timestamptz AT TIME ZONE 'UTC',
        false, now(), now()
      FROM unnest(
        ${r.map((x) => x.contractId)}::int[], ${r.map((x) => x.type)}::text[],
        ${r.map((x) => x.issuerId)}::int[], ${r.map((x) => x.issuerCorporationId)}::int[],
        ${r.map((x) => x.forCorporation)}::bool[], ${r.map((x) => x.title)}::text[],
        ${r.map((x) => x.dateIssued.toISOString())}::timestamptz[],
        ${r.map((x) => x.dateExpired.toISOString())}::timestamptz[],
        ${r.map((x) => x.daysToComplete)}::int[], ${r.map((x) => x.volume)}::float8[],
        ${r.map((x) => x.startLocationId?.toString() ?? null)}::int8[],
        ${r.map((x) => x.endLocationId?.toString() ?? null)}::int8[],
        ${r.map((x) => x.regionId)}::int[], ${r.map((x) => x.solarSystemId)}::int[],
        ${r.map((x) => x.stationId)}::int[], ${r.map((x) => x.price)}::float8[],
        ${r.map((x) => x.reward)}::float8[], ${r.map((x) => x.collateral)}::float8[],
        ${r.map((x) => x.buyout)}::float8[]
      ) AS v(id, t, iss, corp, fc, title, issued, expired, days, vol, sl, el, reg, sys, st, price, reward,
        coll, buyout)
      ON CONFLICT ("contractId") DO NOTHING
      RETURNING "contractId"`;
    inserted.push(...ids.map((i) => i.contractId));
  }
  return inserted;
};

/** Ended contracts this listing shows again; returns those reopened. */
const reopenContracts = async (
  tx: Prisma.TransactionClient,
  contractIds: number[],
  observedAt: number,
) => {
  const reopened: number[] = [];
  for (const c of chunks(contractIds)) {
    const ids = await tx.$queryRaw<{ contractId: number }[]>`
      UPDATE "Contract" SET "isDeleted" = false, "endReason" = NULL,
        "lastSeenAt" = GREATEST("lastSeenAt", ${iso(observedAt)}::timestamptz AT TIME ZONE 'UTC'),
        "updatedAt" = now()
      WHERE "contractId" = ANY(${c}::int[]) AND "isDeleted" = true
      RETURNING "contractId"`;
    reopened.push(...ids.map((i) => i.contractId));
  }
  return reopened;
};

const endContracts = async (
  tx: Prisma.TransactionClient,
  ends: ContractEnd[],
) => {
  for (const c of chunks(ends)) {
    await tx.$executeRaw`
      UPDATE "Contract" c SET "isDeleted" = true, "endReason" = v.reason::"ContractEndReason",
        "lastSeenAt" = v.ls AT TIME ZONE 'UTC', "updatedAt" = now()
      FROM unnest(${c.map((e) => e.contractId)}::int[],
        ${c.map((e) => iso(e.lastSeenAt))}::timestamptz[],
        ${c.map((e) => e.endReason)}::text[]) AS v(id, ls, reason)
      WHERE c."contractId" = v.id AND c."isDeleted" = false`;
  }
};

/**
 * Apply one region's listing: insert new contracts, reopen listed ones that
 * had ended, and, if the listing is complete, end the outstanding ones it no
 * longer lists. The issuers, corporations and NPC stations of contracts not
 * stored yet must already be stored: the insert keeps their foreign keys.
 */
export const applyRegionListing = (
  listing: RegionListing,
  history: RegionHistory | null,
): Promise<AppliedListing> =>
  prisma.$transaction(
    async (tx) => {
      const { regionId, observedAt, contracts } = listing;
      const outstanding = await outstandingOf(tx, regionId);
      const plan = planRegionListing({
        history,
        observedAt,
        listedIds: new Set(contracts.map((c) => c.contractId)),
        outstanding,
      });
      if (plan.skip) {
        return {
          regionId,
          skipped: true,
          complete: false,
          inserted: [],
          reopened: [],
          ended: [],
          history,
        };
      }
      const known = new Set(outstanding.map((c) => c.contractId));
      const unknown = contracts.filter((c) => !known.has(c.contractId));
      const inserted = await insertContracts(tx, unknown, observedAt);
      const fresh = new Set(inserted);
      const reopened = await reopenContracts(
        tx,
        unknown.map((c) => c.contractId).filter((id) => !fresh.has(id)),
        observedAt,
      );
      await endContracts(tx, plan.ends);
      return {
        regionId,
        skipped: false,
        complete: plan.complete,
        inserted,
        reopened,
        ended: plan.ends.map((e) => ({
          contractId: e.contractId,
          reason: e.endReason,
        })),
        history: plan.history,
      };
    },
    { timeout: 120_000, maxWait: 60_000 },
  );

/**
 * The daily checkpoint: an outstanding contract's lastSeenAt becomes its
 * region's last complete listing, which listed it (or it would have ended).
 * Contracts first seen after that listing already have a later lastSeenAt, and
 * lastSeenAt only ever moves forward.
 */
export const checkpointContractTimeline = (
  regions: { regionId: number; lastCompleteAt: number }[],
) =>
  regions.length === 0
    ? Promise.resolve(0)
    : prisma.$executeRaw`
      UPDATE "Contract" c SET "lastSeenAt" = v.t AT TIME ZONE 'UTC'
      FROM unnest(${regions.map((r) => r.regionId)}::int[],
        ${regions.map((r) => iso(r.lastCompleteAt))}::timestamptz[]) AS v(r, t)
      WHERE c."regionId" = v.r AND c."isDeleted" = false
        AND (c."lastSeenAt" IS NULL OR c."lastSeenAt" < v.t AT TIME ZONE 'UTC')`;
