import React, { memo, useCallback, useEffect, useMemo } from "react";
import { Group, Text } from "@mantine/core";
import { useForceUpdate, useTimeout } from "@mantine/hooks";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

import { GetCharactersCharacterIdAssetsQueryResponse } from "@jitaspace/esi-client";
import {
  useEsiNamePrefetch,
  useEsiNamesCache,
  useMarketPrices,
} from "@jitaspace/hooks";
import { ISKAmount, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

type AssetsDataTableProps = {
  entries: GetCharactersCharacterIdAssetsQueryResponse;
};

export const AssetsDataTable = memo(({ entries }: AssetsDataTableProps) => {
  const forceUpdate = useForceUpdate();
  const cache = useEsiNamesCache();
  const { data: marketPrices } = useMarketPrices();

  useEsiNamePrefetch(
    Object.values(entries ?? {}).map((asset) => ({
      id: asset.type_id,
      category: "inventory_type",
    })),
  );

  const getNameFromCache = useCallback(
    (id: number) => cache[id]?.value?.name,
    [cache],
  );

  const typeIds = useMemo(
    () => [...new Set(entries.map((entry) => entry.type_id))],
    [entries],
  );

  const typeNames = useMemo(() => {
    const names: Record<number, string | undefined> = {};
    typeIds.forEach((typeId) => (names[typeId] = getNameFromCache(typeId)));
    return names;
  }, [getNameFromCache, typeIds]);

  const augmentedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        unitPrice: marketPrices[entry.type_id]?.adjusted_price,
        typeName: typeNames[entry.type_id],
      })),
    [entries, marketPrices, typeNames],
  );

  const numUndefinedNames = useMemo(
    () =>
      augmentedEntries.filter((entry) => entry.typeName === undefined).length,
    [augmentedEntries],
  );

  // reload if some asset names are still missing
  const { start } = useTimeout(() => forceUpdate(), 1000);

  useEffect(() => {
    console.log("still undefined:", numUndefinedNames);
    if (numUndefinedNames > 0) start();
  }, [numUndefinedNames, start]);

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
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group noWrap>
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
        Cell: ({ renderedCellValue, row, cell }) => {
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

  return (
    <>
      <Text>NUM UNDEFINED: {numUndefinedNames}</Text>
      <MantineReactTable table={table} />
    </>
  );
});
AssetsDataTable.displayName = "AssetsDataTable";
