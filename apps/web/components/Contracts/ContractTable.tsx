"use client";

import { Group, Text } from "@mantine/core";

import type { DataTableColumn, DataTableSort } from "@jitaspace/datatable";
import { ISKAmount } from "@jitaspace/ui";

import type { ContractSummary } from "./contract";
import type { ContractSort } from "./filters";
import { ContractAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { CONTRACT_KIND_LABEL, contractHeadlineIsk } from "./contract";
import {
  ContractArtwork,
  contractDisplayName,
  ContractIssuer,
  ContractLocationLine,
  ContractTiming,
  ContractTypeIcon,
  formatVolume,
  RelativeTime,
} from "./ContractParts";

/** Kinds, amounts and dates stay on one line, so every row keeps one line's height. */
const NOWRAP = { whiteSpace: "nowrap" } as const;

/** What the Contract column sorts and filters by: its first item, else the title. */
const contractName = (row: ContractSummary) =>
  row.items?.first?.name ?? row.title;

/** A location's sort and filter text: its system, then its station's name. */
const locationText = (
  location: ContractSummary["start"],
  regionName?: string | null,
) =>
  [location?.solarSystemName, location?.name, regionName]
    .filter(Boolean)
    .join(" ") || null;

const time = (iso: string) => Date.parse(iso);

/**
 * Columns for a list of contracts. Every one sorts and filters the rows it is
 * given: the public list hands it every open contract the page's filters
 * match, so its headers sort and filter all of them, not one page.
 */
function columns(
  resolveStructures: boolean,
): DataTableColumn<ContractSummary>[] {
  return [
    {
      id: "type",
      header: "Type",
      accessor: (row) => CONTRACT_KIND_LABEL[row.type],
      width: 130,
      sortable: true,
      filter: { type: "multi-select" },
      cell: (row) => (
        <Group gap={6} wrap="nowrap">
          <ContractTypeIcon type={row.type} size={18} />
          <Text size="sm" style={NOWRAP}>
            {CONTRACT_KIND_LABEL[row.type]}
          </Text>
        </Group>
      ),
    },
    {
      id: "contract",
      header: "Contract",
      accessor: contractName,
      sortable: true,
      filter: { type: "text" },
      // The title too: a contract named for its first item can say more.
      filterAccessor: (row) => `${contractName(row)} ${row.title}`,
      cell: (row) => (
        <Group gap="xs" wrap="nowrap" miw={0}>
          <ContractArtwork type={row.type} item={row.items?.first} size={24} />
          <ContractAnchor
            contractId={row.contractId}
            size="sm"
            fw={500}
            truncate
          >
            {contractDisplayName(row)}
          </ContractAnchor>
        </Group>
      ),
    },
    {
      id: "title",
      header: "Title",
      accessor: "title",
      defaultVisible: false,
      sortable: true,
      filter: { type: "text" },
      cell: (row) => (
        <Text size="sm" c="dimmed" truncate>
          {row.title}
        </Text>
      ),
    },
    {
      id: "isk",
      header: "Price",
      accessor: (row) => contractHeadlineIsk(row).amount,
      align: "right",
      width: 140,
      sortable: true,
      filter: { type: "range", min: 0 },
      cell: (row) => {
        const { amount } = contractHeadlineIsk(row);
        return amount === null ? null : (
          <ISKAmount amount={amount} size="sm" fw={600} style={NOWRAP} />
        );
      },
    },
    {
      id: "collateral",
      header: "Collateral",
      accessor: "collateral",
      align: "right",
      width: 120,
      sortable: true,
      filter: { type: "range", min: 0 },
      cell: (row) =>
        row.collateral === null ? null : (
          <ISKAmount amount={row.collateral} size="sm" style={NOWRAP} />
        ),
    },
    {
      id: "buyout",
      header: "Buyout",
      accessor: "buyout",
      align: "right",
      width: 120,
      sortable: true,
      filter: { type: "range", min: 0 },
      defaultVisible: false,
      cell: (row) =>
        row.buyout === null ? null : (
          <ISKAmount amount={row.buyout} size="sm" style={NOWRAP} />
        ),
    },
    {
      id: "volume",
      header: "Volume",
      accessor: "volume",
      align: "right",
      width: 120,
      sortable: true,
      filter: { type: "range", min: 0 },
      defaultVisible: false,
      cell: (row) =>
        row.volume === null ? null : (
          <Text size="sm" style={NOWRAP}>
            {formatVolume(row.volume)}
          </Text>
        ),
    },
    {
      id: "location",
      header: "Location",
      accessor: (row) => row.start?.solarSystemName ?? row.regionName ?? null,
      sortable: true,
      filter: { type: "text" },
      filterAccessor: (row) => locationText(row.start, row.regionName),
      cell: (row) => (
        <ContractLocationLine
          location={row.start}
          regionName={row.regionName}
          resolveStructures={resolveStructures}
          size="sm"
        />
      ),
    },
    {
      id: "destination",
      header: "Destination",
      accessor: (row) =>
        row.type === "courier" ? (row.end?.solarSystemName ?? null) : null,
      sortable: true,
      filter: { type: "text" },
      filterAccessor: (row) =>
        row.type === "courier" ? locationText(row.end) : null,
      cell: (row) =>
        row.type === "courier" ? (
          <ContractLocationLine
            location={row.end}
            resolveStructures={resolveStructures}
            size="sm"
          />
        ) : null,
    },
    {
      id: "issuer",
      header: "Issuer",
      accessor: (row) =>
        (row.forCorporation ? row.issuerCorporationName : row.issuerName) ??
        null,
      sortable: true,
      filter: { type: "text" },
      // Either name finds it: the issuer and the corporation it belongs to.
      filterAccessor: (row) =>
        [row.issuerName, row.issuerCorporationName].filter(Boolean).join(" "),
      cell: (row) => <ContractIssuer contract={row} />,
    },
    {
      id: "issued",
      header: "Issued",
      accessor: "dateIssued",
      width: 120,
      sortable: true,
      sortAccessor: (row) => time(row.dateIssued),
      filter: { type: "date-range" },
      cell: (row) => (
        <Text size="sm" c="dimmed" style={NOWRAP}>
          <RelativeTime date={row.dateIssued} />
        </Text>
      ),
    },
    {
      id: "expires",
      header: "Expires",
      accessor: "dateExpired",
      width: 150,
      sortable: true,
      sortAccessor: (row) => time(row.dateExpired),
      filter: { type: "date-range" },
      cell: (row) => <ContractTiming contract={row} size="sm" />,
    },
  ];
}

/** The header sort that orders a table as the page's Sort menu does. */
export const CONTRACT_SORT_COLUMN: Record<ContractSort, DataTableSort> = {
  newest: { columnId: "issued", direction: "desc" },
  oldest: { columnId: "issued", direction: "asc" },
  expiring: { columnId: "expires", direction: "asc" },
  "price-desc": { columnId: "isk", direction: "desc" },
  "price-asc": { columnId: "isk", direction: "asc" },
};

const PUBLIC_COLUMNS = columns(false);
const OWN_COLUMNS = columns(true);

/**
 * Contracts in a table whose headers sort and filter them. Rows come in the
 * order given until a header sorts them. `pageSize` pages them in the table,
 * for a list too long to render at once (the public one: ~50k).
 */
export function ContractTable({
  contracts,
  resolveStructures = false,
  isLoading,
  pageSize,
  initialSort,
  emptyText,
}: Readonly<{
  contracts: ContractSummary[];
  resolveStructures?: boolean;
  isLoading?: boolean;
  pageSize?: number;
  /** The sort its headers start from; without one, the given order. */
  initialSort?: ContractSort;
  emptyText?: string;
}>) {
  return (
    <DataTable
      data={contracts}
      columns={resolveStructures ? OWN_COLUMNS : PUBLIC_COLUMNS}
      rowId={(row) => row.contractId}
      isLoading={isLoading}
      withPagination={pageSize !== undefined}
      defaultPageSize={pageSize}
      initialSort={initialSort && CONTRACT_SORT_COLUMN[initialSort]}
      emptyText={emptyText}
      withColumnVisibility
      verticalSpacing="xs"
      fontSize="sm"
      highlightOnHover
      striped
    />
  );
}
