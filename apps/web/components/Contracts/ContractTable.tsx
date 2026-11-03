"use client";

import { Group, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { ISKAmount } from "@jitaspace/ui";

import type { ContractSummary } from "./contract";
import { ContractAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { CONTRACT_KIND_LABEL, contractHeadlineIsk } from "./contract";
import {
  ContractArtwork,
  contractDisplayName,
  ContractIssuer,
  ContractLocationLine,
  ContractStatusBadge,
  ContractTypeIcon,
  ExpiryText,
  formatVolume,
  RelativeTime,
} from "./ContractParts";

/** Amounts and dates stay on one line, so every row keeps one line's height. */
const NOWRAP = { whiteSpace: "nowrap" } as const;

/**
 * Columns for a page of contracts. None sorts: the public list is sorted and
 * paged by the server (the page's Sort menu), so sorting a column would only
 * reorder the rows already on screen and look like a global sort.
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
      cell: (row) => (
        <Group gap={6} wrap="nowrap">
          <ContractTypeIcon type={row.type} size={18} />
          <Text size="sm">{CONTRACT_KIND_LABEL[row.type]}</Text>
        </Group>
      ),
    },
    {
      id: "contract",
      header: "Contract",
      accessor: (row) => row.items?.first?.name ?? row.title,
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
      accessor: (row) => row.end?.solarSystemName ?? null,
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
      cell: (row) => <ContractIssuer contract={row} />,
    },
    {
      id: "issued",
      header: "Issued",
      accessor: "dateIssued",
      width: 120,
      defaultVisible: false,
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
      cell: (row) =>
        row.status && row.status !== "outstanding" ? (
          <ContractStatusBadge status={row.status} size="sm" />
        ) : (
          <Text size="sm" c="dimmed" style={NOWRAP}>
            <ExpiryText date={row.dateExpired} />
          </Text>
        ),
    },
  ];
}

const PUBLIC_COLUMNS = columns(false);
const OWN_COLUMNS = columns(true);

export function ContractTable({
  contracts,
  resolveStructures = false,
  isLoading,
}: Readonly<{
  contracts: ContractSummary[];
  resolveStructures?: boolean;
  isLoading?: boolean;
}>) {
  return (
    <DataTable
      data={contracts}
      columns={resolveStructures ? OWN_COLUMNS : PUBLIC_COLUMNS}
      rowId={(row) => row.contractId}
      isLoading={isLoading}
      withColumnVisibility
      verticalSpacing="xs"
      fontSize="sm"
      highlightOnHover
      striped
    />
  );
}
