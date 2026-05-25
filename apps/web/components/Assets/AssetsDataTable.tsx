import type { MRT_ColumnDef } from "mantine-react-table";
import { memo, useMemo } from "react";
import { Group, Text } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { CharacterAsset } from "@jitaspace/hooks";
import { useEsiNameLookup, useMarketPrices } from "@jitaspace/hooks";
import { ISKAmount, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

interface AssetsDataTableProps {
  entries: CharacterAsset[];
}

export const AssetsDataTable = memo(({ entries }: AssetsDataTableProps) => {
  const { data: marketPrices } = useMarketPrices();

  const assetEntries = useMemo(
    () =>
      entries.map((asset) => ({
        id: asset.type_id,
        category: "inventory_type" as const,
      })),
    [entries],
  );
  const names = useEsiNameLookup(assetEntries);

  const augmentedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        unitPrice: marketPrices[entry.type_id]?.adjusted_price,
        typeName: names[entry.type_id.toString()]?.value?.name,
      })),
    [entries, marketPrices, names],
  );

  const columns = useMemo<MRT_ColumnDef<(typeof augmentedEntries)[number]>[]>(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "item_id",
        size: 40,
      },
      {
        id: "quantity",
        header: "Quantity",
        accessorKey: "quantity",
        size: 40,
      },
      {
        id: "item",
        header: "Item",
        accessorFn: (row) => {
          return row.typeName?.trim() ?? row.type_id;
        },
        size: 300,
        enableColumnFilter: false,
        Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) => (
          <Group wrap="nowrap">
            <TypeAvatar typeId={row.original.type_id} size="sm" />
            <TypeAnchor
              typeId={row.original.type_id}
              target="_blank"
              size="sm"
              lineClamp={1}
            >
              {row.original.typeName}
            </TypeAnchor>
          </Group>
        ),
      },
      {
        id: "price",
        header: "Price",
        size: 40,
        accessorFn: (row) => {
          const adjustedPrice = marketPrices[row.type_id]?.adjusted_price;
          return adjustedPrice ? adjustedPrice * row.quantity : undefined;
        },
        Cell: ({ renderedCellValue: _renderedCellValue, row: _row, cell }) => {
          const value = cell.getValue<number>();
          return value !== undefined ? <ISKAmount amount={value} /> : undefined;
        },
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    positionPagination: "top",
    enableFacetedValues: true,
    data: augmentedEntries,
    initialState: {
      density: "xs",
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
      columnVisibility: {},
    },
  });

  return <MantineReactTable table={table} />;
});
AssetsDataTable.displayName = "AssetsDataTable";
