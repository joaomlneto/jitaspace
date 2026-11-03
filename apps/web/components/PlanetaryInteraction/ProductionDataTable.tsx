"use client";

import { memo, useMemo } from "react";
import { Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";

import type { PiCatalog } from "./catalog";
import type { ProductionRow, StorageRow } from "./colonies";
import { DataTable } from "~/components/DataTable";
import { tierLabel } from "./catalog";
import {
  CharacterCell,
  formatInteger,
  formatNumber,
  PlanetCell,
  TypeCell,
} from "./cells";

const TIER_OPTIONS = [0, 1, 2, 3, 4].map((tier) => ({
  value: tierLabel(tier),
  label: tierLabel(tier),
}));

const NO_PRODUCTION: ProductionRow[] = [];
const NO_STORAGE: StorageRow[] = [];

const typeNameAccessor =
  (catalog: PiCatalog) =>
  ({ typeId }: { typeId: number }) =>
    catalog.types[typeId]?.name ?? String(typeId);

const rate = (value: number) => (value === 0 ? "—" : formatNumber(value));

export const ProductionDataTable = memo(
  ({
    rows,
    catalog,
    isLoading = false,
  }: Readonly<{
    rows?: ProductionRow[];
    catalog: PiCatalog;
    isLoading?: boolean;
  }>) => {
    const columns = useMemo<DataTableColumn<ProductionRow>[]>(
      () => [
        {
          id: "commodity",
          header: "Commodity",
          accessor: typeNameAccessor(catalog),
          sortable: true,
          cell: (row) => <TypeCell typeId={row.typeId} catalog={catalog} />,
        },
        {
          id: "tier",
          header: "Tier",
          accessor: (row) => tierLabel(row.tier),
          sortable: true,
          sortAccessor: (row) => row.tier,
          filter: { type: "multi-select", options: TIER_OPTIONS },
        },
        {
          id: "extracted",
          header: "Extracted / h",
          accessor: "extractedPerHour",
          sortable: true,
          align: "right",
          cell: (row) => rate(row.extractedPerHour),
        },
        {
          id: "produced",
          header: "Produced / h",
          accessor: "producedPerHour",
          sortable: true,
          align: "right",
          cell: (row) => rate(row.producedPerHour),
        },
        {
          id: "consumed",
          header: "Consumed / h",
          accessor: "consumedPerHour",
          sortable: true,
          align: "right",
          cell: (row) => rate(row.consumedPerHour),
        },
        {
          id: "net",
          header: "Net / h",
          accessor: "netPerHour",
          sortable: true,
          align: "right",
          cell: (row) => (
            <Text size="sm" fw={600} c={row.netPerHour < 0 ? "red" : undefined}>
              {formatNumber(row.netPerHour)}
            </Text>
          ),
        },
        {
          id: "perDay",
          header: "Net / day",
          accessor: (row) => row.netPerHour * 24,
          sortable: true,
          align: "right",
          cell: (row) => formatInteger(row.netPerHour * 24),
        },
        {
          id: "colonies",
          header: "Colonies",
          accessor: "colonies",
          sortable: true,
          align: "right",
          defaultVisible: false,
        },
      ],
      [catalog],
    );

    return (
      <DataTable
        data={rows ?? NO_PRODUCTION}
        columns={columns}
        rowId={(row) => row.typeId}
        isLoading={isLoading}
        emptyText="Nothing is being extracted or produced."
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "net", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
ProductionDataTable.displayName = "ProductionDataTable";

export const StorageDataTable = memo(
  ({
    rows,
    catalog,
    showCharacter,
    isLoading = false,
  }: Readonly<{
    rows?: StorageRow[];
    catalog: PiCatalog;
    showCharacter: boolean;
    isLoading?: boolean;
  }>) => {
    const columns = useMemo<DataTableColumn<StorageRow>[]>(
      () => [
        {
          id: "commodity",
          header: "Commodity",
          accessor: typeNameAccessor(catalog),
          sortable: true,
          filter: { type: "multi-select" },
          cell: (row) => <TypeCell typeId={row.typeId} catalog={catalog} />,
        },
        {
          id: "tier",
          header: "Tier",
          accessor: (row) => tierLabel(row.tier),
          sortable: true,
          sortAccessor: (row) => row.tier,
          filter: { type: "multi-select", options: TIER_OPTIONS },
        },
        {
          id: "amount",
          header: "Amount",
          accessor: "amount",
          sortable: true,
          align: "right",
          cell: (row) => formatInteger(row.amount),
        },
        {
          id: "planet",
          header: "Planet",
          accessor: "planetId",
          sortable: true,
          cell: (row) => <PlanetCell planetId={row.planetId} />,
        },
        ...(showCharacter
          ? [
              {
                id: "character",
                header: "Character",
                accessor: "characterId",
                sortable: true,
                cell: (row) => <CharacterCell characterId={row.characterId} />,
              } satisfies DataTableColumn<StorageRow>,
            ]
          : []),
      ],
      [catalog, showCharacter],
    );

    return (
      <DataTable
        data={rows ?? NO_STORAGE}
        columns={columns}
        rowId={(row) => row.key}
        isLoading={isLoading}
        emptyText="Nothing in storage."
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "amount", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
StorageDataTable.displayName = "StorageDataTable";
