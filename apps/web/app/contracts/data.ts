import { cacheLife } from "next/cache";

import type {
  ContractKind,
  ContractLocation,
  ContractSummary,
} from "~/components/Contracts/contract";
import type { ContractFilters } from "~/components/Contracts/filters";
import type { Prisma } from "~/lib/db";
import { locationKind } from "~/components/Contracts/contract";
import { PUBLIC_CONTRACTS_PAGE_SIZE } from "~/components/Contracts/filters";
import { prisma } from "~/lib/db";

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
  // No `_count` here: Prisma counts a relation by grouping the whole related
  // table before joining it, which took 27 s over ContractItem's millions of
  // historical rows. `readPageExtras` counts only the page's contracts.
  // The first offered item names a contract that has no title, as in game.
  items: {
    where: { isIncluded: true },
    orderBy: { recordId: "asc" },
    take: 1,
    select: { typeId: true, quantity: true, type: { select: { name: true } } },
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

async function readPageExtras(
  rows: ContractRow[],
): Promise<ContractPageExtras> {
  const contractId = { in: rows.map((row) => row.contractId) };
  const [endStations, items, bids] = await Promise.all([
    readEndStations(rows),
    prisma.contractItem.groupBy({
      by: ["contractId"],
      where: { contractId },
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
          }
        : null,
    },
    bidCount: bidCounts.get(row.contractId) ?? 0,
    highestBid: row.bids[0]?.amount ?? null,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    isOpen: !row.isDeleted,
  };
}

function whereFor(filters: ContractFilters): Prisma.ContractWhereInput {
  const and: Prisma.ContractWhereInput[] = [{ isDeleted: false }];
  // Loans have not been offered since 2019, and "unknown" is a placeholder;
  // neither is listed.
  and.push({
    type:
      filters.type === "all"
        ? { in: ["ItemExchange", "Auction", "Courier"] }
        : DB_TYPE[filters.type],
  });
  if (filters.regionId !== null) and.push({ regionId: filters.regionId });
  if (filters.q) {
    and.push({ title: { contains: filters.q, mode: "insensitive" } });
  }
  if (filters.typeId !== null) {
    and.push({ items: { some: { typeId: filters.typeId } } });
  }
  // A courier's headline amount is its reward; everyone else's is the price.
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const range = {
      ...(filters.minPrice !== null && { gte: filters.minPrice }),
      ...(filters.maxPrice !== null && { lte: filters.maxPrice }),
    };
    and.push({
      OR: [
        { type: { not: "Courier" }, price: range },
        { type: "Courier", reward: range },
      ],
    });
  }
  return { AND: and };
}

function orderFor(
  filters: ContractFilters,
): Prisma.ContractOrderByWithRelationInput[] {
  const priceColumn = filters.type === "courier" ? "reward" : "price";
  switch (filters.sort) {
    case "oldest":
      return [{ dateIssued: "asc" }, { contractId: "asc" }];
    case "expiring":
      return [{ dateExpired: "asc" }, { contractId: "asc" }];
    case "price-desc":
      return [
        { [priceColumn]: { sort: "desc", nulls: "last" } },
        { contractId: "asc" },
      ];
    case "price-asc":
      return [
        { [priceColumn]: { sort: "asc", nulls: "last" } },
        { contractId: "asc" },
      ];
    case "newest":
      return [{ dateIssued: "desc" }, { contractId: "desc" }];
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
  const where = whereFor(filters);
  const [rows, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: orderFor(filters),
      skip: (filters.page - 1) * PUBLIC_CONTRACTS_PAGE_SIZE,
      take: PUBLIC_CONTRACTS_PAGE_SIZE,
      select: contractSummarySelect,
    }),
    prisma.contract.count({ where }),
  ]);
  const extras = await readPageExtras(rows);
  return {
    contracts: rows.map((row) => toContractSummary(row, extras)),
    total,
    page: filters.page,
    pageSize: PUBLIC_CONTRACTS_PAGE_SIZE,
  };
}

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
  };
}
