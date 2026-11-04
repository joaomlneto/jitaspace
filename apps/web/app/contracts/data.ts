import { cacheLife } from "next/cache";

import type {
  ContractKind,
  ContractLocation,
  ContractSummary,
} from "~/components/Contracts/contract";
import type { ContractFilters } from "~/components/Contracts/filters";
import {
  BLUEPRINT_CATEGORY_ID,
  locationKind,
  typeImageVariation,
} from "~/components/Contracts/contract";
import { PUBLIC_CONTRACTS_PAGE_SIZE } from "~/components/Contracts/filters";
import { Prisma, prisma } from "~/lib/db";

/**
 * Public contracts, read from the snapshots the background jobs store.
 *
 * "Open" means the latest snapshot still listed it (`isDeleted = false`), which
 * is only as current as the ingest: the archive backfill works forward in time,
 * so `readOpenContractsOverview().snapshotAt` says how far it has got.
 */

const KIND: Record<string, ContractKind> = {
  ItemExchange: "item_exchange",
  Auction: "auction",
  Courier: "courier",
  Loan: "loan",
  Unknown: "unknown",
};

const DB_TYPE = {
  item_exchange: "ItemExchange",
  auction: "Auction",
  courier: "Courier",
} as const;

export const contractSummarySelect = {
  contractId: true,
  type: true,
  title: true,
  issuerId: true,
  issuer: { select: { name: true } },
  issuerCorporationId: true,
  issuerCorporation: { select: { name: true } },
  forCorporation: true,
  dateIssued: true,
  dateExpired: true,
  daysToComplete: true,
  volume: true,
  price: true,
  reward: true,
  collateral: true,
  buyout: true,
  startLocationId: true,
  endLocationId: true,
  regionId: true,
  region: { select: { name: true } },
  solarSystem: {
    select: { solarSystemId: true, name: true, securityStatus: true },
  },
  station: { select: { name: true } },
  lastSeenAt: true,
  isDeleted: true,
  endReason: true,
  // No `_count` here: Prisma counts a relation by grouping the whole related
  // table before joining it, which took 27 s over ContractItem's millions of
  // historical rows. `readPageExtras` counts only the page's contracts.
  // The first offered item names a contract that has no title, as in game.
  items: {
    where: { isIncluded: true },
    orderBy: { recordId: "asc" },
    take: 1,
    select: {
      typeId: true,
      quantity: true,
      isBlueprintCopy: true,
      type: {
        select: { name: true, group: { select: { categoryId: true } } },
      },
    },
  },
  bids: {
    orderBy: { amount: "desc" },
    take: 1,
    select: { amount: true },
  },
} satisfies Prisma.ContractSelect;

type ContractRow = Prisma.ContractGetPayload<{
  select: typeof contractSummarySelect;
}>;

type StationNames = Map<
  number,
  {
    name: string;
    solarSystemId: number | null;
    solarSystemName: string | null;
    securityStatus: number | null;
  }
>;

/** What a summary needs beyond its own row, read for a page of rows at once. */
export interface ContractPageExtras {
  endStations: StationNames;
  itemCounts: Map<number, number>;
  bidCounts: Map<number, number>;
}

/**
 * Names for the NPC stations couriers deliver to. The start location's comes
 * through the contract's own relations; the end location has no foreign key
 * (it may be a structure), so it is looked up here, for a page at a time.
 */
export async function readEndStations(
  rows: Pick<ContractRow, "startLocationId" | "endLocationId">[],
): Promise<StationNames> {
  const ids = [
    ...new Set(
      rows.flatMap((row) => {
        const id =
          row.endLocationId === null ? null : Number(row.endLocationId);
        return id !== null &&
          id !== Number(row.startLocationId) &&
          locationKind(id) === "station"
          ? [id]
          : [];
      }),
    ),
  ];
  if (ids.length === 0) return new Map();
  const stations = await prisma.station.findMany({
    where: { stationId: { in: ids } },
    select: {
      stationId: true,
      name: true,
      solarSystem: {
        select: { solarSystemId: true, name: true, securityStatus: true },
      },
    },
  });
  return new Map(
    stations.map((station) => [
      station.stationId,
      {
        name: station.name,
        solarSystemId: station.solarSystem?.solarSystemId ?? null,
        solarSystemName: station.solarSystem?.name ?? null,
        securityStatus:
          station.solarSystem === null
            ? null
            : Number(station.solarSystem.securityStatus),
      },
    ]),
  );
}

/** The counts and end stations a page of rows needs (`toContractSummary`). */
export async function readPageExtras(
  rows: ContractRow[],
): Promise<ContractPageExtras> {
  const contractId = { in: rows.map((row) => row.contractId) };
  const [endStations, items, bids] = await Promise.all([
    readEndStations(rows),
    // Offered items only: the count says how many more a contract offers
    // than the one that names it (contractDisplayName).
    prisma.contractItem.groupBy({
      by: ["contractId"],
      where: { contractId, isIncluded: true },
      _count: { _all: true },
    }),
    prisma.contractBid.groupBy({
      by: ["contractId"],
      where: { contractId },
      _count: { _all: true },
    }),
  ]);
  return {
    endStations,
    itemCounts: new Map(
      items.map((group) => [group.contractId, group._count._all]),
    ),
    bidCounts: new Map(
      bids.map((group) => [group.contractId, group._count._all]),
    ),
  };
}

/** ESI reports 0 for amounts a contract does not use; show them as absent. */
function nonZero(value: number | null): number | null {
  return value === 0 ? null : value;
}

export function toContractSummary(
  row: ContractRow,
  { endStations, itemCounts, bidCounts }: ContractPageExtras,
): ContractSummary {
  const startId =
    row.startLocationId === null ? null : Number(row.startLocationId);
  const endId = row.endLocationId === null ? null : Number(row.endLocationId);

  const start: ContractLocation | null =
    startId === null
      ? null
      : {
          locationId: startId,
          kind: locationKind(startId),
          name: row.station?.name ?? null,
          solarSystemId: row.solarSystem?.solarSystemId ?? null,
          solarSystemName: row.solarSystem?.name ?? null,
          securityStatus:
            row.solarSystem === null
              ? null
              : Number(row.solarSystem.securityStatus),
        };

  let end: ContractLocation | null = null;
  if (endId !== null) {
    if (endId === startId) {
      end = start;
    } else {
      const station = endStations.get(endId);
      end = { locationId: endId, kind: locationKind(endId), ...station };
    }
  }

  const firstItem = row.items[0];
  return {
    contractId: row.contractId,
    type: KIND[row.type] ?? "unknown",
    title: row.title,
    issuerId: row.issuerId,
    issuerName: row.issuer.name,
    issuerCorporationId: row.issuerCorporationId,
    issuerCorporationName: row.issuerCorporation.name,
    forCorporation: row.forCorporation,
    dateIssued: row.dateIssued.toISOString(),
    dateExpired: row.dateExpired.toISOString(),
    daysToComplete: row.daysToComplete,
    volume: row.volume,
    price: nonZero(row.price),
    reward: nonZero(row.reward),
    collateral: nonZero(row.collateral),
    buyout: nonZero(row.buyout),
    start,
    end,
    regionId: row.regionId,
    regionName: row.region.name,
    items: {
      count: itemCounts.get(row.contractId) ?? 0,
      first: firstItem
        ? {
            typeId: firstItem.typeId,
            name: firstItem.type.name,
            quantity: firstItem.quantity,
            imageVariation: typeImageVariation(
              firstItem.type.group.categoryId === BLUEPRINT_CATEGORY_ID,
              firstItem.isBlueprintCopy,
            ),
          }
        : null,
    },
    bidCount: bidCounts.get(row.contractId) ?? 0,
    highestBid: row.bids[0]?.amount ?? null,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    isOpen: !row.isDeleted,
    endReason: row.endReason,
  };
}

/** Each listed type's enum value, as a SQL literal Postgres can compare. */
const LISTED_TYPES = ["ItemExchange", "Auction", "Courier"] as const;

const enumValue = (type: string) => Prisma.sql`CAST(${type} AS "ContractType")`;

/**
 * The amount a contract is listed at, as its card shows it
 * (`contractHeadlineIsk`): a courier's reward, a "want to buy" exchange's
 * reward (its price is 0), everyone else's price. ESI reports unused amounts
 * as 0, hence the NULLIFs. Sorting and the price filter use this, so a sort
 * by price does not open with every courier's 0.
 */
// A function, not a constant: building it at import would touch Prisma before
// anything runs, which pages' tests (which stub the client) cannot load.
const headlineIsk = () => Prisma.sql`COALESCE(
  NULLIF(CASE WHEN c."type" = 'Courier' THEN c."reward" ELSE c."price" END, 0),
  NULLIF(c."reward", 0)
)`;

/** A title search means `%` and `_` literally; LIKE escapes them with a backslash. */
function likeContaining(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function whereFor(filters: ContractFilters): Prisma.Sql {
  // Loans have not been offered since 2019, and "unknown" is a placeholder;
  // neither is listed.
  const types = filters.type === "all" ? LISTED_TYPES : [DB_TYPE[filters.type]];
  const conditions = [
    Prisma.sql`c."isDeleted" = false`,
    Prisma.sql`c."type" IN (${Prisma.join(types.map(enumValue))})`,
  ];
  if (filters.regionId !== null) {
    conditions.push(Prisma.sql`c."regionId" = ${filters.regionId}`);
  }
  if (filters.q) {
    conditions.push(Prisma.sql`c."title" ILIKE ${likeContaining(filters.q)}`);
  }
  if (filters.minPrice !== null) {
    conditions.push(Prisma.sql`${headlineIsk()} >= ${filters.minPrice}`);
  }
  if (filters.maxPrice !== null) {
    conditions.push(Prisma.sql`${headlineIsk()} <= ${filters.maxPrice}`);
  }
  return Prisma.join(conditions, " AND ");
}

function orderFor(filters: ContractFilters): Prisma.Sql {
  switch (filters.sort) {
    case "oldest":
      return Prisma.sql`c."dateIssued" ASC, c."contractId" ASC`;
    case "expiring":
      return Prisma.sql`c."dateExpired" ASC, c."contractId" ASC`;
    case "price-desc":
      return Prisma.sql`${headlineIsk()} DESC NULLS LAST, c."contractId" ASC`;
    case "price-asc":
      return Prisma.sql`${headlineIsk()} ASC NULLS LAST, c."contractId" ASC`;
    case "newest":
      return Prisma.sql`c."dateIssued" DESC, c."contractId" DESC`;
  }
}

export interface PublicContractsPage {
  contracts: ContractSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * One page of open public contracts matching `filters`.
 *
 * Not cached here: `/api/contracts` serves it behind CDN cache headers, which
 * share one read per filter combination across every visitor.
 */
export async function readPublicContracts(
  filters: ContractFilters,
): Promise<PublicContractsPage> {
  // Raw SQL for the page's ids, so the order and the price filter can use
  // headlineIsk(); Prisma's query builder cannot order by an expression. The
  // rows themselves still come through the typed select.
  const where = whereFor(filters);
  const [page, [{ total }]] = await Promise.all([
    prisma.$queryRaw<{ contractId: number }[]>`
      SELECT c."contractId" FROM "Contract" c
      WHERE ${where}
      ORDER BY ${orderFor(filters)}
      LIMIT ${PUBLIC_CONTRACTS_PAGE_SIZE}
      OFFSET ${(filters.page - 1) * PUBLIC_CONTRACTS_PAGE_SIZE}`,
    prisma.$queryRaw<[{ total: number }]>`
      SELECT count(*)::int AS total FROM "Contract" c WHERE ${where}`,
  ]);
  const ids = page.map((row) => row.contractId);
  const found = await prisma.contract.findMany({
    where: { contractId: { in: ids } },
    select: contractSummarySelect,
  });
  const byId = new Map(found.map((row) => [row.contractId, row]));
  const rows = ids.flatMap((id) => byId.get(id) ?? []);
  const extras = await readPageExtras(rows);
  return {
    contracts: rows.map((row) => toContractSummary(row, extras)),
    total,
    page: filters.page,
    pageSize: PUBLIC_CONTRACTS_PAGE_SIZE,
  };
}

/** Older than this, the public snapshot is a backfill still catching up. */
const BACKFILL_LAG_MS = 2 * 24 * 60 * 60 * 1000;

export interface ContractRegionFacet {
  regionId: number;
  name: string;
  count: number;
}

export interface OpenContractsOverview {
  /** Regions with open contracts, busiest first. */
  regions: ContractRegionFacet[];
  total: number;
  /** The latest snapshot the open contracts come from, or null when empty. */
  snapshotAt: string | null;
  /**
   * The snapshot is over two days old as of this read, so the contracts are
   * still being imported. Decided here, inside the cached read, so the page
   * renders the same notice on the server as in the browser.
   */
  isBackfilling: boolean;
}

/**
 * What the page shell shows before any filter: which regions have open
 * contracts, how many, and how current the snapshot is. Hourly, like the
 * ingest; uncaught, so a database failure throws rather than caching an empty
 * browser (apps/web/CLAUDE.md → "Never catch a database error inside a
 * `"use cache"` scope").
 */
export async function readOpenContractsOverview(): Promise<OpenContractsOverview> {
  "use cache";
  cacheLife("hours");

  const [groups, latest] = await Promise.all([
    prisma.contract.groupBy({
      by: ["regionId"],
      where: {
        isDeleted: false,
        type: { in: ["ItemExchange", "Auction", "Courier"] },
      },
      _count: { _all: true },
    }),
    prisma.contract.aggregate({
      where: { isDeleted: false },
      _max: { lastSeenAt: true },
    }),
  ]);
  const regions = await prisma.region.findMany({
    where: { regionId: { in: groups.map((group) => group.regionId) } },
    select: { regionId: true, name: true },
  });
  const names = new Map(
    regions.map((region) => [region.regionId, region.name]),
  );

  return {
    regions: groups
      .map((group) => ({
        regionId: group.regionId,
        name: names.get(group.regionId) ?? `Region ${group.regionId}`,
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    total: groups.reduce((sum, group) => sum + group._count._all, 0),
    snapshotAt: latest._max.lastSeenAt?.toISOString() ?? null,
    isBackfilling:
      latest._max.lastSeenAt !== null &&
      Date.now() - latest._max.lastSeenAt.getTime() > BACKFILL_LAG_MS,
  };
}
