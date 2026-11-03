/**
 * Applies observations of a region's public contract listing to the database,
 * through the pure engine in `contractTimeline.ts`. Every writer of the
 * contract timeline goes through here (the ESI sync job and the EVE Ref
 * snapshot ingest), so they can run in any order or at the same time:
 * - each observation is one transaction, holding a transaction-scoped advisory
 *   lock on its region (safe through PgBouncer's transaction pooling), so two
 *   writers of one region queue instead of interleaving;
 * - the region's observation log (ContractRegionObservation) and the contracts
 *   missing from its latest observation (ContractAbsence) are shared state,
 *   read and written in that same transaction.
 */
import type { Prisma } from "../db";
import type {
  AppliedObservation,
  ContractEndReason,
  ContractTimelineState,
  LoggedObservation,
  RegionObservation,
  StoredContract,
} from "./contractTimeline";
import type { ContractRow } from "./publicContracts";
import { prisma } from "../db";
import {
  applyRegionObservation,
  observationReach,
  seedLogOf,
} from "./contractTimeline";

/** First key of the advisory lock (the second is the region): "CONT". */
const LOCK_NAMESPACE = 0x434f4e54;
/**
 * Ended absences and old observations are kept this long. An observation more
 * than this much older than its region's latest can no longer be applied as if
 * it had come in order, so it is refused.
 */
export const TIMELINE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** Observations kept before the oldest one still needed, for the median. */
const HISTORY_KEPT = 20;
const CHUNK = 5000;

const chunks = <T>(xs: readonly T[], size = CHUNK) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};
const iso = (ms: number | null) =>
  ms === null ? null : new Date(ms).toISOString();

/** One region's listing as a source read it. */
export interface RegionListing {
  regionId: number;
  /** Epoch ms: the listing's Last-Modified. */
  observedAt: number;
  /** Every contract listed, as a Contract row. */
  contracts: ContractRow[];
}

export interface AppliedListing {
  regionId: number;
  /** Refused: older than the timeline can still correct. */
  refused: boolean;
  inserted: number[];
  reopened: number[];
  ended: { contractId: number; reason: ContractEndReason | null }[];
  /** Already ended, but with a corrected lastSeen or reason. */
  corrected: number[];
  /** Missing from the latest observation, not yet ended. */
  missing: number;
}

interface StoredRow {
  contractId: number;
  dateExpired: Date;
  dateIssued: Date;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  isDeleted: boolean;
  endReason: ContractEndReason | null;
  absenceLastSeenAt: Date | null;
  absenceEnded: boolean | null;
}

const toStored = (r: StoredRow): StoredContract => ({
  contractId: r.contractId,
  dateExpired: r.dateExpired.getTime(),
  firstSeenAt: r.firstSeenAt?.getTime() ?? null,
  lastSeenAt: (r.lastSeenAt ?? r.firstSeenAt ?? r.dateIssued).getTime(),
  isDeleted: r.isDeleted,
  endReason: r.endReason,
  absence:
    r.absenceLastSeenAt === null
      ? null
      : {
          lastSeenAt: r.absenceLastSeenAt.getTime(),
          ended: r.absenceEnded ?? false,
        },
});

const SELECT_STORED = `c."contractId", c."dateExpired", c."dateIssued", c."firstSeenAt", c."lastSeenAt",
  c."isDeleted", c."endReason"::text AS "endReason", a."lastSeenAt" AS "absenceLastSeenAt",
  a.ended AS "absenceEnded"`;

const insertContracts = async (
  tx: Prisma.TransactionClient,
  rows: { row: ContractRow; state: ContractTimelineState }[],
) => {
  for (const c of chunks(rows)) {
    const r = c.map((x) => x.row);
    const s = c.map((x) => x.state);
    await tx.$executeRaw`
      INSERT INTO "Contract" ("contractId", type, "issuerId", "issuerCorporationId", "forCorporation", title,
        "dateIssued", "dateExpired", "daysToComplete", volume, "startLocationId", "endLocationId", "regionId",
        "solarSystemId", "stationId", price, reward, collateral, buyout, "firstSeenAt", "lastSeenAt",
        "isDeleted", "endReason", "createdAt", "updatedAt")
      SELECT id, t::"ContractType", iss, corp, fc, title, issued AT TIME ZONE 'UTC', expired AT TIME ZONE 'UTC',
        days, vol, sl, el, reg, sys, st, price, reward, coll, buyout, fs AT TIME ZONE 'UTC',
        ls AT TIME ZONE 'UTC', del, reason::"ContractEndReason", now(), now()
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
        ${r.map((x) => x.buyout)}::float8[], ${s.map((x) => iso(x.firstSeenAt))}::timestamptz[],
        ${s.map((x) => iso(x.lastSeenAt))}::timestamptz[], ${s.map((x) => x.isDeleted)}::bool[],
        ${s.map((x) => x.endReason)}::text[]
      ) AS v(id, t, iss, corp, fc, title, issued, expired, days, vol, sl, el, reg, sys, st, price, reward,
        coll, buyout, fs, ls, del, reason)
      ON CONFLICT ("contractId") DO NOTHING`;
  }
};

/**
 * Overwrite contracts' own fields (expiry and all) with those of the listing
 * that is now their earliest. Only an auction's expiry actually differs
 * between listings: ESI recomputes it from the listing's time.
 */
const restateContracts = async (
  tx: Prisma.TransactionClient,
  rows: ContractRow[],
) => {
  for (const r of chunks(rows)) {
    await tx.$executeRaw`
      UPDATE "Contract" c SET type = v.t::"ContractType", "issuerId" = v.iss, "issuerCorporationId" = v.corp,
        "forCorporation" = v.fc, title = v.title, "dateIssued" = v.issued AT TIME ZONE 'UTC',
        "dateExpired" = v.expired AT TIME ZONE 'UTC', "daysToComplete" = v.days, volume = v.vol,
        "startLocationId" = v.sl, "endLocationId" = v.el, "solarSystemId" = v.sys, "stationId" = v.st,
        price = v.price, reward = v.reward, collateral = v.coll, buyout = v.buyout, "updatedAt" = now()
      FROM unnest(
        ${r.map((x) => x.contractId)}::int[], ${r.map((x) => x.type)}::text[],
        ${r.map((x) => x.issuerId)}::int[], ${r.map((x) => x.issuerCorporationId)}::int[],
        ${r.map((x) => x.forCorporation)}::bool[], ${r.map((x) => x.title)}::text[],
        ${r.map((x) => x.dateIssued.toISOString())}::timestamptz[],
        ${r.map((x) => x.dateExpired.toISOString())}::timestamptz[],
        ${r.map((x) => x.daysToComplete)}::int[], ${r.map((x) => x.volume)}::float8[],
        ${r.map((x) => x.startLocationId?.toString() ?? null)}::int8[],
        ${r.map((x) => x.endLocationId?.toString() ?? null)}::int8[],
        ${r.map((x) => x.solarSystemId)}::int[], ${r.map((x) => x.stationId)}::int[],
        ${r.map((x) => x.price)}::float8[], ${r.map((x) => x.reward)}::float8[],
        ${r.map((x) => x.collateral)}::float8[], ${r.map((x) => x.buyout)}::float8[]
      ) AS v(id, t, iss, corp, fc, title, issued, expired, days, vol, sl, el, sys, st, price, reward, coll, buyout)
      WHERE c."contractId" = v.id`;
  }
};

const updateContracts = async (
  tx: Prisma.TransactionClient,
  updates: { contractId: number; state: ContractTimelineState }[],
) => {
  for (const c of chunks(updates)) {
    await tx.$executeRaw`
      UPDATE "Contract" c SET "firstSeenAt" = v.fs AT TIME ZONE 'UTC', "lastSeenAt" = v.ls AT TIME ZONE 'UTC',
        "isDeleted" = v.del, "endReason" = v.reason::"ContractEndReason", "updatedAt" = now()
      FROM unnest(${c.map((u) => u.contractId)}::int[],
        ${c.map((u) => iso(u.state.firstSeenAt))}::timestamptz[],
        ${c.map((u) => iso(u.state.lastSeenAt))}::timestamptz[],
        ${c.map((u) => u.state.isDeleted)}::bool[],
        ${c.map((u) => u.state.endReason)}::text[]) AS v(id, fs, ls, del, reason)
      WHERE c."contractId" = v.id`;
  }
};

const writeAbsences = async (
  tx: Prisma.TransactionClient,
  regionId: number,
  changes: { contractId: number; state: ContractTimelineState }[],
) => {
  const present = changes.filter((c) => c.state.absence === null);
  const absent = changes.flatMap((c) =>
    c.state.absence ? [{ contractId: c.contractId, ...c.state.absence }] : [],
  );
  for (const c of chunks(present)) {
    await tx.$executeRaw`
      DELETE FROM "ContractAbsence" WHERE "contractId" = ANY(${c.map((x) => x.contractId)}::int[])`;
  }
  for (const c of chunks(absent)) {
    await tx.$executeRaw`
      INSERT INTO "ContractAbsence" ("contractId", "regionId", "lastSeenAt", ended, "updatedAt")
      SELECT id, ${regionId}, ls AT TIME ZONE 'UTC', e, now()
      FROM unnest(${c.map((x) => x.contractId)}::int[],
        ${c.map((x) => iso(x.lastSeenAt))}::timestamptz[], ${c.map((x) => x.ended)}::bool[])
        AS v(id, ls, e)
      ON CONFLICT ("contractId") DO UPDATE SET "lastSeenAt" = EXCLUDED."lastSeenAt",
        ended = EXCLUDED.ended, "updatedAt" = now()`;
  }
};

const loadLog = async (tx: Prisma.TransactionClient, regionId: number) =>
  (
    await tx.$queryRaw<
      { observedAt: Date; contractCount: number; isSeed: boolean }[]
    >`SELECT "observedAt", "contractCount", "isSeed" FROM "ContractRegionObservation"
      WHERE "regionId" = ${regionId}`
  ).map<LoggedObservation>((o) => ({
    observedAt: o.observedAt.getTime(),
    contractCount: o.contractCount,
    isSeed: o.isSeed,
  }));

/** Seed an empty log with the region's outstanding count. */
const seedLog = async (
  tx: Prisma.TransactionClient,
  regionId: number,
  outstanding: number,
) => {
  const log = seedLogOf(outstanding);
  for (const seed of log) {
    await tx.$executeRaw`
      INSERT INTO "ContractRegionObservation" ("regionId", "observedAt", "contractCount", "isSeed")
      VALUES (${regionId}, ${iso(seed.observedAt)}::timestamptz AT TIME ZONE 'UTC',
        ${seed.contractCount}, true)
      ON CONFLICT DO NOTHING`;
  }
  return log;
};

/**
 * Every stored contract the observation can affect: the region's outstanding
 * ones, the ended ones it lists, and the ended absences within its reach.
 * One connection per transaction, so these run one after the other.
 */
const loadStored = async (
  tx: Prisma.TransactionClient,
  regionId: number,
  outstanding: StoredRow[],
  log: readonly LoggedObservation[],
  observation: RegionObservation,
) => {
  const reach = observationReach(log, observation);
  const readAll =
    reach.completenessChanged || !Number.isFinite(reach.endedSince);
  const listedEnded = await tx.$queryRawUnsafe<StoredRow[]>(
    `SELECT ${SELECT_STORED} FROM "Contract" c
     LEFT JOIN "ContractAbsence" a ON a."contractId" = c."contractId"
     WHERE c."contractId" = ANY($1::int[]) AND c."isDeleted" = true`,
    [...observation.contractIds],
  );
  const endedAbsences = await tx.$queryRawUnsafe<StoredRow[]>(
    `SELECT ${SELECT_STORED} FROM "ContractAbsence" a
     JOIN "Contract" c ON c."contractId" = a."contractId"
     WHERE a."regionId" = $1 AND a.ended
       AND ($2::bool OR a."lastSeenAt" >= $3::timestamptz AT TIME ZONE 'UTC')`,
    regionId,
    readAll,
    iso(Number.isFinite(reach.endedSince) ? reach.endedSince : 0),
  );
  const stored = new Map<number, StoredContract>();
  for (const r of [...outstanding, ...listedEnded, ...endedAbsences]) {
    stored.set(r.contractId, toStored(r));
  }
  return stored;
};

/** What changed, for the caller's stats and work queues. */
const summarise = (
  regionId: number,
  stored: ReadonlyMap<number, StoredContract>,
  applied: AppliedObservation,
): Omit<AppliedListing, "missing"> => {
  const result = {
    regionId,
    refused: false,
    inserted: applied.inserts.map((i) => i.contractId),
    reopened: [] as number[],
    ended: applied.inserts.flatMap((i) =>
      i.state.isDeleted
        ? [{ contractId: i.contractId, reason: i.state.endReason }]
        : [],
    ),
    corrected: [] as number[],
  };
  for (const { contractId, state } of applied.updates) {
    const wasEnded = stored.get(contractId)?.isDeleted;
    if (wasEnded === undefined) continue;
    if (wasEnded && !state.isDeleted) result.reopened.push(contractId);
    else if (!wasEnded && state.isDeleted) {
      result.ended.push({ contractId, reason: state.endReason });
    } else if (wasEnded) result.corrected.push(contractId);
  }
  return result;
};

/**
 * Apply one region's listing to the contract timeline. Idempotent, and
 * independent of the order listings arrive in (see `contractTimeline.ts`).
 * The issuers, corporations and NPC stations of contracts not stored yet must
 * already be stored: the insert keeps their foreign keys.
 */
export const applyRegionListing = (
  listing: RegionListing,
): Promise<AppliedListing> =>
  prisma.$transaction(
    async (tx) => {
      const { regionId, observedAt } = listing;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, ${regionId}::int)`;

      let log = await loadLog(tx, regionId);
      const latest = Math.max(
        ...log.filter((o) => !o.isSeed).map((o) => o.observedAt),
      );
      if (observedAt < latest - TIMELINE_RETENTION_MS) {
        return {
          regionId,
          refused: true,
          inserted: [],
          reopened: [],
          ended: [],
          corrected: [],
          missing: 0,
        };
      }
      const outstanding = await tx.$queryRawUnsafe<StoredRow[]>(
        `SELECT ${SELECT_STORED} FROM "Contract" c
         LEFT JOIN "ContractAbsence" a ON a."contractId" = c."contractId"
         WHERE c."regionId" = $1 AND c."isDeleted" = false`,
        regionId,
      );
      if (log.length === 0)
        log = await seedLog(tx, regionId, outstanding.length);

      const rows = new Map(listing.contracts.map((c) => [c.contractId, c]));
      const observation: RegionObservation = {
        observedAt,
        contractIds: new Set(rows.keys()),
        dateExpired: new Map(
          listing.contracts.map((c) => [c.contractId, c.dateExpired.getTime()]),
        ),
      };
      const stored = await loadStored(
        tx,
        regionId,
        outstanding,
        log,
        observation,
      );
      const applied = applyRegionObservation({
        log,
        observation,
        stored: [...stored.values()],
        fresh: listing.contracts
          .filter((c) => !stored.has(c.contractId))
          .map((c) => ({
            contractId: c.contractId,
            dateExpired: c.dateExpired.getTime(),
          })),
      });

      await insertContracts(
        tx,
        applied.inserts.flatMap(({ contractId, state }) => {
          const row = rows.get(contractId);
          return row ? [{ row, state }] : [];
        }),
      );
      await restateContracts(
        tx,
        applied.restated.flatMap((id) => rows.get(id) ?? []),
      );
      await updateContracts(tx, applied.updates);
      await writeAbsences(tx, regionId, [
        ...applied.inserts,
        ...applied.updates,
      ]);
      await tx.$executeRaw`
        INSERT INTO "ContractRegionObservation" ("regionId", "observedAt", "contractCount", "isSeed")
        VALUES (${regionId}, ${iso(observedAt)}::timestamptz AT TIME ZONE 'UTC',
          ${applied.log.contractCount}, false)
        ON CONFLICT ("regionId", "observedAt") DO UPDATE
          SET "contractCount" = GREATEST("ContractRegionObservation"."contractCount", EXCLUDED."contractCount")`;

      const [missing] = await tx.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int n FROM "ContractAbsence" WHERE "regionId" = ${regionId} AND NOT ended`;
      return {
        ...summarise(regionId, stored, applied),
        missing: missing?.n ?? 0,
      };
    },
    { timeout: 120_000, maxWait: 60_000 },
  );

/**
 * The daily checkpoint: Contract.lastSeenAt for every outstanding contract
 * listed in its region's latest observation becomes that observation's time.
 * It only ever moves lastSeenAt forward, so any writer may run it, any time.
 */
export const checkpointContractTimeline = () => prisma.$executeRaw`
  UPDATE "Contract" c SET "lastSeenAt" = l.latest
  FROM (SELECT "regionId", max("observedAt") latest FROM "ContractRegionObservation"
        WHERE NOT "isSeed" GROUP BY "regionId") l
  WHERE c."regionId" = l."regionId" AND c."isDeleted" = false
    AND (c."lastSeenAt" IS NULL OR c."lastSeenAt" < l.latest)
    AND NOT EXISTS (SELECT 1 FROM "ContractAbsence" a WHERE a."contractId" = c."contractId")`;

/**
 * Forget what the timeline no longer needs: ended absences older than
 * {@link TIMELINE_RETENTION_MS}, and observations older than that which no
 * remaining absence still counts misses from (keeping {@link HISTORY_KEPT}
 * before the oldest that one does, for the completeness median).
 */
export const pruneContractTimeline = async (now: number) => {
  const cutoff = iso(now - TIMELINE_RETENTION_MS);
  const absences = await prisma.$executeRaw`
    DELETE FROM "ContractAbsence" WHERE ended AND "lastSeenAt" < ${cutoff}::timestamptz AT TIME ZONE 'UTC'`;
  const observations = await prisma.$executeRaw`
    WITH need AS (
      SELECT r."regionId",
        LEAST(COALESCE(min(a."lastSeenAt"), 'infinity'::timestamp), ${cutoff}::timestamptz AT TIME ZONE 'UTC') AS t
      FROM (SELECT DISTINCT "regionId" FROM "ContractRegionObservation") r
      LEFT JOIN "ContractAbsence" a ON a."regionId" = r."regionId"
      GROUP BY r."regionId"
    ), older AS (
      SELECT o."regionId", o."observedAt",
        row_number() OVER (PARTITION BY o."regionId" ORDER BY o."observedAt" DESC) AS n
      FROM "ContractRegionObservation" o JOIN need ON need."regionId" = o."regionId"
      WHERE NOT o."isSeed" AND o."observedAt" < need.t
    )
    DELETE FROM "ContractRegionObservation" o USING older
    WHERE o."regionId" = older."regionId" AND o."observedAt" = older."observedAt"
      AND older.n > ${HISTORY_KEPT}`;
  return { absences, observations };
};
