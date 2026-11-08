import type {
  OpenContractsShard,
  SnapshotContract,
} from "~/components/Contracts/snapshot";
import {
  BLUEPRINT_CATEGORY_ID,
  locationKind,
} from "~/components/Contracts/contract";
import {
  ITEM_ASKED,
  ITEM_COPY,
  OPEN_CONTRACT_SHARDS,
  SNAPSHOT_KINDS,
} from "~/components/Contracts/snapshot";
import { Prisma, prisma } from "~/lib/db";

/**
 * One shard of the open public contracts (`components/Contracts/snapshot.ts`),
 * read from the snapshots the background jobs store.
 *
 * Not cached here: `/api/contracts/open/[shard]` serves it behind CDN cache
 * headers, so the database reads each shard about once per sync. A shard is
 * too large for a `"use cache"` entry (Vercel keeps at most 2 MB per item).
 */

/** Older than this, the public listing is an archive import still catching up. */
const BACKFILL_LAG_MS = 2 * 24 * 60 * 60 * 1000;

const KIND_INDEX = new Map<string, number>(
  (["ItemExchange", "Auction", "Courier"] as const).map((type, index) => [
    type,
    index,
  ]),
);

interface ContractRow {
  contractId: number;
  type: string;
  title: string;
  issuerId: number;
  issuerCorporationId: number;
  forCorporation: boolean;
  dateIssued: Date;
  dateExpired: Date;
  daysToComplete: number | null;
  volume: number | null;
  price: number | null;
  reward: number | null;
  collateral: number | null;
  buyout: number | null;
  regionId: number;
  startLocationId: bigint | null;
  endLocationId: bigint | null;
  solarSystemId: number | null;
  stationId: number | null;
  lastSeenAt: Date | null;
}

interface ItemRow {
  contractId: number;
  typeId: number;
  quantity: number;
  isIncluded: boolean;
  isBlueprintCopy: boolean | null;
}
interface BidRow {
  contractId: number;
  highest: number;
  count: number;
}
interface NameRow {
  id: number;
  name: string;
}
interface StationRow {
  stationId: number;
  name: string;
  solarSystemId: number | null;
}
interface TypeRow {
  typeId: number;
  name: string;
  categoryId: number;
}
interface SystemRow {
  solarSystemId: number;
  name: string;
  securityStatus: number;
}

/** The open public contracts in a shard. */
const inShard = (shard: number) => Prisma.sql`"isDeleted" = false
  AND "type" IN ('ItemExchange', 'Auction', 'Courier')
  AND "contractId" % ${OPEN_CONTRACT_SHARDS} = ${shard}`;

/**
 * The shard's contract ids, as a subquery for `= ANY(ARRAY(…))`. Not the ids
 * the first read returned, bound as an array: told it holds ~6k ids, the
 * planner leaves ContractItem's primary key for a plan that took 90 s, where
 * this one reads the primary key in 2 s.
 */
const shardIds = (shard: number) =>
  Prisma.sql`SELECT "contractId" FROM "Contract" WHERE ${inShard(shard)}`;

/** ESI reports 0 for amounts a contract does not use; send them as absent. */
const nonZero = (value: number | null) => (value === 0 ? null : value);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);
const distinct = <T>(values: Iterable<T>) => [...new Set(values)];

export async function readOpenContractsShard(
  shard: number,
): Promise<OpenContractsShard> {
  // Raw SQL for the shard's modulo, which Prisma's query builder cannot say.
  // The names come in lookups by distinct id below: joining them here costs a
  // random read into Character (22M rows) for every contract, ~5 s cold.
  const rows = await prisma.$queryRaw<ContractRow[]>`
    SELECT "contractId", "type"::text AS "type", "title", "issuerId",
      "issuerCorporationId", "forCorporation", "dateIssued", "dateExpired",
      "daysToComplete", "volume", "price", "reward", "collateral", "buyout",
      "regionId", "startLocationId", "endLocationId", "solarSystemId",
      "stationId", "lastSeenAt"
    FROM "Contract"
    WHERE ${inShard(shard)}
    ORDER BY "contractId"`;

  // The NPC stations a contract starts at (its own relation) or delivers to
  // (no foreign key: it may be a structure).
  const stationIds = distinct(
    rows.flatMap((row) => {
      const end = row.endLocationId === null ? null : Number(row.endLocationId);
      return [
        ...(row.stationId === null ? [] : [row.stationId]),
        ...(end !== null && locationKind(end) === "station" ? [end] : []),
      ];
    }),
  );

  // Items and bids select the shard again (shardIds). The name lookups pass
  // their few thousand ids as one array parameter, where Prisma's `in` would
  // bind one parameter per id.
  const [items, bids, characters, corporations, regions, stations] =
    await Promise.all([
      prisma.$queryRaw<ItemRow[]>`
        SELECT "contractId", "typeId", "quantity", "isIncluded", "isBlueprintCopy"
        FROM "ContractItem"
        WHERE "contractId" = ANY(ARRAY(${shardIds(shard)}))
        ORDER BY "contractId", "recordId"`,
      prisma.$queryRaw<BidRow[]>`
        SELECT "contractId", max("amount") AS "highest", count(*)::int AS "count"
        FROM "ContractBid"
        WHERE "contractId" = ANY(ARRAY(${shardIds(shard)}))
        GROUP BY "contractId"`,
      prisma.$queryRaw<NameRow[]>`
        SELECT "characterId" AS "id", "name" FROM "Character"
        WHERE "characterId" = ANY(${distinct(rows.map((r) => r.issuerId))}::int[])`,
      prisma.$queryRaw<NameRow[]>`
        SELECT "corporationId" AS "id", "name" FROM "Corporation"
        WHERE "corporationId" = ANY(${distinct(rows.map((r) => r.issuerCorporationId))}::int[])`,
      prisma.$queryRaw<NameRow[]>`
        SELECT "regionId" AS "id", "name" FROM "Region"
        WHERE "regionId" = ANY(${distinct(rows.map((r) => r.regionId))}::int[])`,
      prisma.$queryRaw<StationRow[]>`
        SELECT "stationId", "name", "solarSystemId" FROM "Station"
        WHERE "stationId" = ANY(${stationIds}::int[])`,
    ]);

  const [types, systems] = await Promise.all([
    prisma.$queryRaw<TypeRow[]>`
      SELECT t."typeId", t."name", g."categoryId"
      FROM "Type" t JOIN "Group" g ON g."groupId" = t."groupId"
      WHERE t."typeId" = ANY(${distinct(items.map((item) => item.typeId))}::int[])`,
    prisma.$queryRaw<SystemRow[]>`
      SELECT "solarSystemId", "name", "securityStatus"::float8 AS "securityStatus"
      FROM "SolarSystem"
      WHERE "solarSystemId" = ANY(${distinct([
        ...rows.flatMap((row) =>
          row.solarSystemId === null ? [] : [row.solarSystemId],
        ),
        ...stations.flatMap((station) =>
          station.solarSystemId === null ? [] : [station.solarSystemId],
        ),
      ])}::int[])`,
  ]);

  const itemsByContract = new Map<number, number[]>();
  for (const item of items) {
    const flat = itemsByContract.get(item.contractId) ?? [];
    flat.push(
      item.typeId,
      item.quantity,
      (item.isIncluded ? 0 : ITEM_ASKED) |
        (item.isBlueprintCopy ? ITEM_COPY : 0),
    );
    itemsByContract.set(item.contractId, flat);
  }
  const bidsByContract = new Map(bids.map((bid) => [bid.contractId, bid]));

  const contracts = rows.map((row): SnapshotContract => {
    const bid = bidsByContract.get(row.contractId);
    return [
      row.contractId,
      KIND_INDEX.get(row.type) ?? SNAPSHOT_KINDS.length,
      row.title,
      row.issuerId,
      row.issuerCorporationId,
      row.forCorporation ? 1 : 0,
      seconds(row.dateIssued),
      seconds(row.dateExpired),
      row.daysToComplete,
      row.volume,
      nonZero(row.price),
      nonZero(row.reward),
      nonZero(row.collateral),
      nonZero(row.buyout),
      row.regionId,
      row.startLocationId === null ? null : Number(row.startLocationId),
      row.solarSystemId,
      row.endLocationId === null ? null : Number(row.endLocationId),
      bid?.highest ?? null,
      bid?.count ?? 0,
      itemsByContract.get(row.contractId) ?? [],
    ];
  });

  const latest = rows.reduce<Date | null>(
    (max, row) =>
      row.lastSeenAt !== null && (max === null || row.lastSeenAt > max)
        ? row.lastSeenAt
        : max,
    null,
  );

  return {
    shard,
    snapshotAt: latest?.toISOString() ?? null,
    isBackfilling:
      latest !== null && Date.now() - latest.getTime() > BACKFILL_LAG_MS,
    contracts,
    characters: Object.fromEntries(characters.map((c) => [c.id, c.name])),
    corporations: Object.fromEntries(corporations.map((c) => [c.id, c.name])),
    regions: Object.fromEntries(regions.map((r) => [r.id, r.name])),
    types: Object.fromEntries(
      types.map((type) => [
        type.typeId,
        [type.name, type.categoryId === BLUEPRINT_CATEGORY_ID ? 1 : 0],
      ]),
    ),
    systems: Object.fromEntries(
      systems.map((system) => [
        system.solarSystemId,
        [system.name, system.securityStatus],
      ]),
    ),
    stations: Object.fromEntries(
      stations.map((station) => [
        station.stationId,
        [station.name, station.solarSystemId],
      ]),
    ),
  };
}
