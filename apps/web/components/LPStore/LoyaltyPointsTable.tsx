import React, { memo, useMemo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";

import {
  FuzzworkTypeMarketAggregate,
  useFuzzworkRegionalMarketAggregates,
} from "@jitaspace/hooks";
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

    const typeIds = useMemo(() => types.map((type) => type.typeId), [types]);

    const marketStats = useFuzzworkRegionalMarketAggregates(typeIds, 10000002);

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
          requiredItems: offer.requiredItems.map((item) => ({
            ...item,
            marketStats: marketStats.data?.[item.typeId],
          })),
          typeName: typeNames[offer.typeId],
          corporationName: corporationNames[offer.corporationId],
          marketStats: marketStats.data?.[offer.typeId],
        })),
      [offers, typeNames, corporationNames, marketStats.data],
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
          marketStats?: FuzzworkTypeMarketAggregate;
        }[];
        typeName: string | undefined;
        corporationName: string | undefined;
        marketStats?: FuzzworkTypeMarketAggregate;
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
                <Group wrap="nowrap">
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
          size: 1,
          mantineTableHeadCellProps: {
            align: "right",
          },
          mantineTableBodyCellProps: {
            align: "right",
          },
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
            <Group wrap="nowrap">
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
          size: 10,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => value?.toLocaleString?.(),
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <Text align="right">{row.original.lpCost.toLocaleString()} LP</Text>
          ),
        },
        {
          header: "ISK Cost",
          accessorKey: "iskCost",
          size: 10,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => <ISKAmount amount={value} />,
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <ISKAmount align="right" amount={row.original.iskCost ?? 0} />
          ),
        },
        {
          header: "AK Cost",
          accessorKey: "akCost",
          size: 40,
          filterVariant: "range-slider",
          mantineTableBodyCellProps: {
            align: "right",
          },
        },
        {
          header: "Required Items",
          accessorKey: "requiredItems",
          size: 300,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack gap="xs">
              {row.original.requiredItems.map(({ quantity, typeId }) => (
                <Group key={typeId} wrap="nowrap" gap="xs">
                  <TypeAvatar typeId={typeId} size="sm" />
                  {quantity !== 1 && <Text size="sm">{quantity}</Text>}
                  <TypeAnchor typeId={typeId} target="_blank">
                    <TypeName span typeId={typeId} size="sm" lineClamp={1} />
                  </TypeAnchor>
                </Group>
              ))}
            </Stack>
          ),
        },
        {
          id: "reqitems5pbuydetailsunit",
          header: "Required Items Jita 5% Buy Unit Prices",
          accessorKey: "requiredItems",
          size: 10,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack gap="xs">
              {row.original.requiredItems.map(
                ({ quantity, typeId, marketStats }) => (
                  <Group key={typeId} wrap="nowrap" justify="space-between">
                    <TypeAvatar typeId={typeId} size="sm" />
                    {marketStats && (
                      <ISKAmount amount={marketStats.buy.percentile} />
                    )}
                  </Group>
                ),
              )}
            </Stack>
          ),
        },
        {
          id: "reqitems5pbuydetailstotal",
          header: "Required Items Jita 5% Buy Prices for Quantities",
          accessorKey: "requiredItems",
          size: 10,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack gap="xs">
              {row.original.requiredItems.map(
                ({ quantity, typeId, marketStats }) => (
                  <Group key={typeId} wrap="nowrap" justify="space-between">
                    <TypeAvatar typeId={typeId} size="sm" />
                    {marketStats && (
                      <ISKAmount
                        amount={marketStats.buy.percentile * quantity}
                      />
                    )}
                  </Group>
                ),
              )}
            </Stack>
          ),
        },
        {
          id: "reqitems5pselldetails",
          header: "Required Items Jita 5% Sell Unit Prices",
          accessorKey: "requiredItems",
          size: 10,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack gap="xs">
              {row.original.requiredItems.map(
                ({ quantity, typeId, marketStats }) => (
                  <Group key={typeId} wrap="nowrap" justify="space-between">
                    <TypeAvatar typeId={typeId} size="sm" />
                    {marketStats && (
                      <ISKAmount amount={marketStats.sell.percentile} />
                    )}
                  </Group>
                ),
              )}
            </Stack>
          ),
        },
        {
          id: "reqitems5pselldetailstotal",
          header: "Required Items Jita 5% Sell Prices for Quantities",
          accessorKey: "requiredItems",
          size: 10,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, cell }) => (
            <Stack gap="xs">
              {row.original.requiredItems.map(
                ({ quantity, typeId, marketStats }) => (
                  <Group key={typeId} wrap="nowrap" justify="space-between">
                    <TypeAvatar typeId={typeId} size="sm" />
                    {marketStats && (
                      <ISKAmount
                        amount={marketStats.sell.percentile * quantity}
                      />
                    )}
                  </Group>
                ),
              )}
            </Stack>
          ),
        },
        {
          id: "jita5psell",
          header: "Jita 5% Sell Price",
          accessorKey: "marketStats.sell.percentile",
          size: 10,
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          header: "Jita Sell Volume",
          accessorKey: "marketStats.sell.volume",
          size: 10,
          mantineTableBodyCellProps: {
            align: "right",
          },
        },
        {
          id: "reqitemsjita5psell",
          header: "Required Items Jita 5% Sell",
          size: 10,
          accessorFn: (row) =>
            row.requiredItems
              .map(
                (item) =>
                  (item.marketStats?.sell.percentile ?? 0) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          id: "jita5psellprofit",
          header: "Jita 5% Sell Profit",
          size: 10,
          accessorFn: (row) =>
            (row.marketStats?.sell.percentile ?? 0) -
            row.requiredItems
              .map(
                (item) =>
                  (item.marketStats?.sell.percentile ?? 0) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          id: "jita5psellisklp",
          header: "Jita 5% Sell ISK/LP",
          size: 10,
          accessorFn: (row) =>
            ((row.marketStats?.sell.percentile ?? 0) -
              (row.iskCost ?? 0) -
              row.requiredItems
                .map(
                  (item) =>
                    (item.marketStats?.sell.percentile ?? 0) *
                    (item.quantity ?? 1),
                )
                .reduce((a, b) => a + b, 0)) /
            row.lpCost,
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <Text align="right">{amount.toFixed(0)} ISK/LP</Text>;
          },
        },
        {
          id: "jita5pbuy",
          header: "Jita 5% Buy Price",
          accessorKey: "marketStats.buy.percentile",
          size: 10,
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          header: "Jita Buy Volume",
          accessorKey: "marketStats.buy.volume",
          size: 10,
          mantineTableBodyCellProps: {
            align: "right",
          },
        },
        {
          id: "reqitemsjita5pbuy",
          header: "Required Items Jita 5% Buy",
          size: 10,
          accessorFn: (row) =>
            row.requiredItems
              .map(
                (item) =>
                  (item.marketStats?.buy.percentile ?? 0) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          id: "jita5pbuyprofit",
          header: "Jita 5% Buy Profit",
          size: 10,
          accessorFn: (row) =>
            (row.marketStats?.buy.percentile ?? 0) -
            row.requiredItems
              .map(
                (item) =>
                  (item.marketStats?.buy.percentile ?? 0) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          id: "jita5pbuyisklp",
          header: "Jita 5% Buy ISK/LP",
          size: 10,
          accessorFn: (row) =>
            ((row.marketStats?.buy.percentile ?? 0) -
              (row.iskCost ?? 0) -
              row.requiredItems
                .map(
                  (item) =>
                    (item.marketStats?.buy.percentile ?? 0) *
                    (item.quantity ?? 1),
                )
                .reduce((a, b) => a + b, 0)) /
            row.lpCost,
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <Text align="right">{amount.toFixed(0)} ISK/LP</Text>;
          },
        },
        {
          id: "jitasplit",
          header: "Jita Split",
          size: 10,
          accessorFn: (row) =>
            row.marketStats?.buy && row.marketStats?.sell
              ? (row.marketStats.buy.percentile +
                  row.marketStats.sell.percentile) /
                2
              : null,
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
        },
        {
          id: "reqitemsjitasplit",
          header: "Required Items Jita 5% Split",
          size: 10,
          accessorFn: (row) =>
            row.requiredItems
              .map(
                (item) =>
                  (((item.marketStats?.buy.percentile ?? 0) +
                    (item.marketStats?.sell.percentile ?? 0)) /
                    2) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          Cell: ({ row, cell }) => {
            const amount = cell.getValue<number | undefined>();
            if (amount === undefined) return null;
            return <ISKAmount align="right" amount={amount} />;
          },
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
          reqitems5pbuydetailsunit: false,
          reqitems5pbuydetailstotal: false,
          reqitems5pselldetailsunit: false,
          reqitems5pselldetailstotal: false,
          jita5pbuy: false,
          reqitemsjita5pbuy: false,
          jita5pbuyprofit: false,
          jitasplit: false,
          reqitemsjitasplit: false,
          jita5psell: false,
          //reqitemsjita5psell: false, // this can be seen as the cost to buy items off the market
          jita5psellprofit: false,
        },
        //showColumnFilters: true,
      },
    });

    return <MantineReactTable table={table} />;
  },
);
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
