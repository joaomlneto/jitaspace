import React, { memo, useMemo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";

import {
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  EveEntitySelect,
  ISKAmount,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

type LoyaltyPointsTableProps = {
  corporations: {
    corporationId: number;
    name: string;
  }[];
  types: {
    typeId: number;
    name: string;
  }[];
  offers: {
    offerId: number;
    corporationId: number;
    typeId: number;
    quantity: number;
    akCost: number | null;
    lpCost: number;
    iskCost: number;
    requiredItems: {
      typeId: number;
      quantity: number;
    }[];
  }[];
};

export const LoyaltyPointsTable = memo(
  ({ corporations, types, offers }: LoyaltyPointsTableProps) => {
    const sortedCorporations = useMemo(
      () => corporations.sort((a, b) => a.name.localeCompare(b.name)),
      [corporations],
    );

    const sortedTypes = useMemo(
      () => types.sort((a, b) => a.name.localeCompare(b.name)),
      [types],
    );

    const typeNames = useMemo(() => {
      const map: Record<number, string> = {};
      types.forEach((type) => (map[type.typeId] = type.name));
      return map;
    }, types);

    const corporationNames = useMemo(() => {
      const map: Record<number, string> = {};
      corporations.forEach(
        (corporation) => (map[corporation.corporationId] = corporation.name),
      );
      return map;
    }, corporations);

    const augmentedOffers = useMemo(
      () =>
        offers.map((offer) => ({
          ...offer,
          typeName: typeNames[offer.typeId],
          corporationName: corporationNames[offer.corporationId],
        })),
      [offers, typeNames, corporationNames],
    );

    const columns = useMemo<
      MRT_ColumnDef<{
        offerId: number;
        corporationId: number;
        typeId: number;
        quantity: number;
        akCost: number | null;
        lpCost: number;
        iskCost: number;
        requiredItems: {
          typeId: number;
          quantity: number;
        }[];
        typeName: string | undefined;
        corporationName: string | undefined;
      }>[]
    >(
      () => [
        {
          id: "id",
          header: "Offer ID",
          accessorKey: "offerId",
          size: 40,
        },
        {
          header: "Corporation",
          accessorKey: "corporationId",
          size: 40,
          sortingFn: (a, b) =>
            (a.original.corporationName ?? "").localeCompare(
              b.original.corporationName ?? "",
            ),
          Filter: ({ column, header, table }) => {
            return (
              <EveEntitySelect
                miw={200}
                entityIds={sortedCorporations.map((corporation) => ({
                  id: corporation.corporationId,
                  name: corporation.name,
                }))}
                searchable
                clearable
                hoverOnSearchChange
                onChange={column.setFilterValue}
              />
            );
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <Group>
              <Tooltip
                label={
                  <CorporationName
                    corporationId={row.original.corporationId}
                    lineClamp={1}
                  />
                }
                color="dark"
              >
                <Group noWrap>
                  <CorporationAvatar
                    corporationId={row.original.corporationId}
                    size="sm"
                  />
                  <CorporationAnchor
                    corporationId={row.original.corporationId}
                    target="_blank"
                  >
                    <CorporationName
                      corporationId={row.original.corporationId}
                    />
                  </CorporationAnchor>
                </Group>
              </Tooltip>
            </Group>
          ),
        },
        {
          id: "quantity",
          header: "Quantity",
          accessorKey: "quantity",
          size: 40,
        },
        {
          header: "Item",
          accessorKey: "typeId",
          size: 300,
          enableColumnFilter: true,
          sortingFn: (a, b) =>
            (a.original.typeName ?? "").localeCompare(
              b.original.typeName ?? "",
            ),
          Filter: ({ column, header, table }) => {
            return (
              <EveEntitySelect
                miw={250}
                entityIds={sortedTypes.map((type) => ({
                  id: type.typeId,
                  name: type.name,
                }))}
                searchable
                clearable
                hoverOnSearchChange
                onChange={column.setFilterValue}
                limit={500}
              />
            );
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <Group noWrap>
              <TypeAvatar typeId={row.original.typeId} size="sm" />
              {row.original.quantity !== 1 && (
                <Text size="sm">{row.original.quantity}</Text>
              )}
              <TypeAnchor typeId={row.original.typeId} target="_blank">
                <TypeName
                  span
                  typeId={row.original.typeId}
                  size="sm"
                  //lineClamp={1}
                />
              </TypeAnchor>
            </Group>
          ),
        },
        {
          header: "LP Cost",
          accessorKey: "lpCost",
          size: 40,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => value?.toLocaleString?.(),
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <Text>{row.original.lpCost.toLocaleString()} LP</Text>
          ),
        },
        {
          header: "ISK Cost",
          accessorKey: "iskCost",
          size: 40,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => <ISKAmount amount={value} />,
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <ISKAmount amount={row.original.iskCost ?? 0} />
          ),
        },
        {
          header: "AK Cost",
          accessorKey: "akCost",
          size: 40,
          filterVariant: "range-slider",
        },
        {
          header: "Required Items",
          accessorKey: "requiredItems",
          size: 300,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack spacing="xs">
              {row.original.requiredItems.map(({ quantity, typeId }) => (
                <Group noWrap key={typeId}>
                  <TypeAvatar typeId={typeId} size="sm" />
                  {row.original.quantity !== 1 && (
                    <Text size="sm">{quantity}</Text>
                  )}
                  <TypeAnchor typeId={typeId} target="_blank">
                    <TypeName span typeId={typeId} size="sm" lineClamp={1} />
                  </TypeAnchor>
                </Group>
              ))}
            </Stack>
          ),
        },
      ],
      [],
    );

    const table = useMantineReactTable({
      columns,
      positionPagination: "top",
      enableFacetedValues: true,
      data: augmentedOffers, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
      initialState: {
        density: "xs",
        sorting: [{ id: "id", desc: true }],
        pagination: {
          pageIndex: 0,
          pageSize: 25,
        },
        columnVisibility: {
          id: false,
          quantity: false,
          corporationId: sortedCorporations.length > 1,
          akCost: offers.some((offer) => offer.akCost),
        },
        showColumnFilters: true,
      },
    });

    return <MantineReactTable table={table} />;
  },
);
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
