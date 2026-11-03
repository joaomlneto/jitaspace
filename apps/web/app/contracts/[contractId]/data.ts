import { cacheLife } from "next/cache";

import type { ContractSummary } from "~/components/Contracts/contract";
import { prisma } from "~/lib/db";
import {
  contractSummarySelect,
  readEndStations,
  toContractSummary,
} from "../data";

/** One line of a contract's items, with what the snapshot recorded about it. */
export interface ContractItemDetail {
  recordId: string;
  typeId: number;
  name: string | null;
  quantity: number;
  /** Offered by the issuer (true) or asked of the acceptor (false). */
  isIncluded: boolean;
  isBlueprintCopy: boolean | null;
  materialEfficiency: number | null;
  timeEfficiency: number | null;
  runs: number | null;
  /** Set for mutated items, whose rolled stats live in `DynamicItem`. */
  mutation: {
    itemId: string;
    sourceTypeId: number;
    mutatorTypeId: number;
    mutatorName: string | null;
  } | null;
}

export interface ContractBidDetail {
  bidId: number;
  amount: number;
  dateBid: string;
}

export interface ContractDetail {
  contract: ContractSummary;
  items: ContractItemDetail[];
  /** Highest first. Public bids carry no bidder. */
  bids: ContractBidDetail[];
  firstSeenAt: string | null;
  endReason: "Expired" | "RemovedBeforeExpiry" | null;
}

/**
 * A public contract as the snapshots recorded it, or null if no snapshot ever
 * listed it — a private contract, or one older than the archive.
 *
 * Uncaught, like every cached read here: a database failure must throw rather
 * than cache a "not found".
 */
export async function readContractDetail(
  contractId: number,
): Promise<ContractDetail | null> {
  "use cache";
  cacheLife("hours");

  const row = await prisma.contract.findUnique({
    where: { contractId },
    select: {
      ...contractSummarySelect,
      firstSeenAt: true,
      endReason: true,
    },
  });
  if (row === null) return null;

  const [items, bids, dynamicItems, endStations] = await Promise.all([
    prisma.contractItem.findMany({
      where: { contractId },
      orderBy: { recordId: "asc" },
      select: {
        recordId: true,
        typeId: true,
        type: { select: { name: true } },
        quantity: true,
        isIncluded: true,
        itemId: true,
        isBlueprintCopy: true,
        materialEfficiency: true,
        timeEfficiency: true,
        runs: true,
      },
    }),
    prisma.contractBid.findMany({
      where: { contractId },
      orderBy: [{ amount: "desc" }, { dateBid: "asc" }],
      select: { bidId: true, amount: true, dateBid: true },
    }),
    prisma.contractDynamicItem.findMany({
      where: { contractId },
      select: {
        item: {
          select: {
            itemId: true,
            sourceTypeId: true,
            mutatorTypeId: true,
            mutatorType: { select: { name: true } },
          },
        },
      },
    }),
    readEndStations([row]),
  ]);

  const mutations = new Map(
    dynamicItems.map(({ item }) => [item.itemId, item]),
  );
  return {
    contract: toContractSummary(row, {
      endStations,
      itemCounts: new Map([[contractId, items.length]]),
      bidCounts: new Map([[contractId, bids.length]]),
    }),
    items: items.map((item) => {
      const mutation =
        item.itemId === null ? undefined : mutations.get(item.itemId);
      return {
        recordId: item.recordId.toString(),
        typeId: item.typeId,
        name: item.type.name,
        quantity: item.quantity,
        isIncluded: item.isIncluded,
        isBlueprintCopy: item.isBlueprintCopy,
        materialEfficiency: item.materialEfficiency,
        timeEfficiency: item.timeEfficiency,
        runs: item.runs,
        mutation: mutation
          ? {
              itemId: mutation.itemId.toString(),
              sourceTypeId: mutation.sourceTypeId,
              mutatorTypeId: mutation.mutatorTypeId,
              mutatorName: mutation.mutatorType.name,
            }
          : null,
      };
    }),
    bids: bids.map((bid) => ({
      bidId: bid.bidId,
      amount: bid.amount,
      dateBid: bid.dateBid.toISOString(),
    })),
    firstSeenAt: row.firstSeenAt?.toISOString() ?? null,
    endReason: row.endReason,
  };
}
