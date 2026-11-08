import type {
  ContractKind,
  ContractLocation,
  ContractSummary,
} from "~/components/Contracts/contract";
import type { Prisma } from "~/lib/db";
import {
  BLUEPRINT_CATEGORY_ID,
  locationKind,
  typeImageVariation,
} from "~/components/Contracts/contract";
import { prisma } from "~/lib/db";

/**
 * Public contracts as the snapshots the background jobs store them, in the
 * shape the views render: the contract page, and the Contracts tabs of
 * character, corporation and type pages (`history.ts`). The open contracts
 * the browser lists travel in a compact form of their own (`snapshot.ts`).
 */

const KIND: Record<string, ContractKind> = {
  ItemExchange: "item_exchange",
  Auction: "auction",
  Courier: "courier",
  Loan: "loan",
  Unknown: "unknown",
};

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
  // historical rows. `readPageExtras` counts only a page's contracts.
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

/** What a summary needs beyond its own row. */
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
