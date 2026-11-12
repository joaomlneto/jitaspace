"use client";

import { SimpleGrid } from "@mantine/core";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { ContractSummary } from "~/components/Contracts/contract";
import {
  ContractCard,
  ContractCardSkeleton,
} from "~/components/Contracts/ContractCard";
import {
  ContractRowList,
  ContractRowListSkeleton,
} from "~/components/Contracts/ContractRow";
import { ContractTable } from "~/components/Contracts/ContractTable";

export const CONTRACT_VIEWS = ["rows", "cards", "table"] as const;
export type ContractView = (typeof CONTRACT_VIEWS)[number];

export const CONTRACT_VIEW_OPTIONS: readonly {
  value: ContractView;
  label: string;
}[] = [
  { value: "rows", label: "Rows" },
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
];

/** The view a contracts list opens in: a table whose headers sort and filter. */
export const DEFAULT_CONTRACT_VIEW: ContractView = "table";

/**
 * How the page lays contracts out, kept in the URL like the filters but apart
 * from them: switching view keeps the page you are on.
 */
export function useContractView() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(CONTRACT_VIEWS)
      .withDefault(DEFAULT_CONTRACT_VIEW)
      .withOptions({ history: "replace" }),
  );
  return [view, (next: ContractView) => void setView(next)] as const;
}

const COLUMNS = { base: 1, sm: 2, lg: 3 };

/** A page of contracts, as rows, cards or a table. */
export function ContractList({
  contracts,
  view,
  resolveStructures,
}: Readonly<{
  contracts: ContractSummary[];
  view: ContractView;
  resolveStructures?: boolean;
}>) {
  if (view === "table") {
    return (
      <ContractTable
        contracts={contracts}
        resolveStructures={resolveStructures}
      />
    );
  }
  if (view === "rows") {
    return (
      <ContractRowList
        contracts={contracts}
        resolveStructures={resolveStructures}
      />
    );
  }
  return (
    <SimpleGrid cols={COLUMNS} spacing="md">
      {contracts.map((contract) => (
        <ContractCard
          key={contract.contractId}
          contract={contract}
          resolveStructures={resolveStructures}
        />
      ))}
    </SimpleGrid>
  );
}

/** Placeholders shaped like the view, so the page keeps its height. */
export function ContractListSkeleton({
  view,
  count,
}: Readonly<{ view: ContractView; count: number }>) {
  if (view === "table") return <ContractTable contracts={[]} isLoading />;
  if (view === "rows") return <ContractRowListSkeleton count={count} />;
  return (
    <SimpleGrid cols={COLUMNS} spacing="md">
      {Array.from({ length: Math.min(count, 12) }, (_, index) => (
        <ContractCardSkeleton key={index} />
      ))}
    </SimpleGrid>
  );
}
