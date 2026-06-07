"use client";

import { memo, useMemo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";

import type { FuzzworkTypeMarketAggregate } from "@jitaspace/hooks";
import { useFuzzworkRegionalMarketAggregates } from "@jitaspace/hooks";
import {
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  ISKAmount,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";
import { type ColumnDef, DataTable } from "@jitaspace/datatable";

interface LoyaltyPointsTableProps {
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
}

type AugmentedOffer = {
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
};

// ---------------------------------------------------------------------------
// Derived-value helpers used in multiple accessorFns
// ---------------------------------------------------------------------------

function requiredItemsSellCost(row: AugmentedOffer): number {
  return row.requiredItems
    .map(
      (item) => (item.marketStats?.sell.percentile ?? 0) * (item.quantity ?? 1),
    )
    .reduce((a, b) => a + b, 0);
}

function requiredItemsBuyCost(row: AugmentedOffer): number {
  return row.requiredItems
    .map(
      (item) => (item.marketStats?.buy.percentile ?? 0) * (item.quantity ?? 1),
    )
    .reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Shared cell renderers
// ---------------------------------------------------------------------------

function iskAmountCell({ getValue }: { getValue: () => unknown }) {
  const amount = getValue() as number | undefined;
  if (amount === undefined) return null;
  return <ISKAmount inherit ta="right" amount={amount} />;
}

function iskPerLpCell({ getValue }: { getValue: () => unknown }) {
  const amount = getValue() as number | undefined;
  if (amount === undefined) return null;
  return (
    <Text inherit ta="right">
      {amount.toFixed(0)} ISK/LP
    </Text>
  );
}

function volumeCell({ getValue }: { getValue: () => unknown }) {
  const volume = getValue() as number | undefined;
  if (volume === undefined) return null;
  return <Text ta="right">{volume.toLocaleString()}</Text>;
}

// ---------------------------------------------------------------------------
// Factory: required-items price list columns (4 variants)
// ---------------------------------------------------------------------------

type ItemPricer = (item: AugmentedOffer["requiredItems"][number]) => number | undefined;

function makeRequiredItemsPriceColumn(
  id: string,
  header: string,
  getPrice: ItemPricer,
): ColumnDef<AugmentedOffer, any> {
  return {
    id,
    header,
    accessorKey: "requiredItems",
    enableSorting: false,
    cell: ({ row }: { row: { original: AugmentedOffer } }) => (
      <Stack gap="xs">
        {row.original.requiredItems.map((item) => {
          const price = getPrice(item);
          return (
            <Group key={item.typeId} wrap="nowrap" justify="space-between">
              <TypeAvatar typeId={item.typeId} size="sm" />
              {price !== undefined && <ISKAmount inherit amount={price} />}
            </Group>
          );
        })}
      </Stack>
    ),
  };
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<AugmentedOffer, any>[] = [
  {
    id: "id",
    header: "Offer ID",
    accessorKey: "offerId",
    enableSorting: true,
  },
  {
    id: "corporationId",
    header: "Corporation",
    accessorKey: "corporationId",
    enableSorting: true,
    sortingFn: (a, b) =>
      (a.original.corporationName ?? "").localeCompare(
        b.original.corporationName ?? "",
      ),
    cell: ({ row }) => (
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
              <CorporationName corporationId={row.original.corporationId} />
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
    enableSorting: true,
    cell: ({ getValue }) => (
      <Text ta="right">{(getValue() as number).toLocaleString()}</Text>
    ),
  },
  {
    id: "typeId",
    header: "Item",
    accessorKey: "typeId",
    enableSorting: true,
    sortingFn: (a, b) =>
      (a.original.typeName ?? "").localeCompare(b.original.typeName ?? ""),
    cell: ({ row }) => (
      <Group wrap="nowrap">
        <TypeAvatar typeId={row.original.typeId} size="sm" />
        {row.original.quantity !== 1 && (
          <Text size="sm">{row.original.quantity}</Text>
        )}
        <TypeAnchor typeId={row.original.typeId} target="_blank">
          <TypeName span typeId={row.original.typeId} size="sm" />
        </TypeAnchor>
      </Group>
    ),
  },
  {
    id: "lpCost",
    header: "LP Cost",
    accessorKey: "lpCost",
    enableSorting: true,
    cell: ({ row }) => (
      <Text inherit ta="right">
        {row.original.lpCost.toLocaleString()} LP
      </Text>
    ),
  },
  {
    id: "iskCost",
    header: "ISK Cost",
    accessorKey: "iskCost",
    enableSorting: true,
    cell: ({ row }) => (
      <ISKAmount inherit ta="right" amount={row.original.iskCost ?? 0} />
    ),
  },
  {
    id: "akCost",
    header: "AK Cost",
    accessorKey: "akCost",
    enableSorting: true,
    cell: ({ getValue }) => (
      <Text ta="right">
        {(getValue() as number | null)?.toLocaleString() ?? ""}
      </Text>
    ),
  },
  {
    id: "requiredItems",
    header: "Required Items",
    accessorKey: "requiredItems",
    enableSorting: false,
    cell: ({ row }) => (
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
  makeRequiredItemsPriceColumn(
    "reqitems5pbuydetailsunit",
    "Required Items Jita 5% Buy Unit Prices",
    (item) => item.marketStats?.buy.percentile,
  ),
  makeRequiredItemsPriceColumn(
    "reqitems5pbuydetailstotal",
    "Required Items Jita 5% Buy Prices for Quantities",
    (item) =>
      item.marketStats === undefined
        ? undefined
        : item.marketStats.buy.percentile * item.quantity,
  ),
  makeRequiredItemsPriceColumn(
    "reqitems5pselldetails",
    "Required Items Jita 5% Sell Unit Prices",
    (item) => item.marketStats?.sell.percentile,
  ),
  makeRequiredItemsPriceColumn(
    "reqitems5pselldetailstotal",
    "Required Items Jita 5% Sell Prices for Quantities",
    (item) =>
      item.marketStats === undefined
        ? undefined
        : item.marketStats.sell.percentile * item.quantity,
  ),
  {
    id: "jita5psell",
    header: "Jita 5% Sell Price",
    accessorFn: (row) => row.marketStats?.sell.percentile,
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jitaSellVolume",
    header: "Jita Sell Volume",
    accessorFn: (row) => row.marketStats?.sell.volume,
    enableSorting: true,
    cell: volumeCell,
  },
  {
    id: "reqitemsjita5psell",
    header: "Required Items Jita 5% Sell",
    accessorFn: requiredItemsSellCost,
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jita5psellprofit",
    header: "Jita 5% Sell Profit",
    accessorFn: (row) =>
      (row.marketStats?.sell.percentile ?? 0) - requiredItemsSellCost(row),
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jita5psellisklp",
    header: "Jita 5% Sell ISK/LP",
    accessorFn: (row) =>
      ((row.marketStats?.sell.percentile ?? 0) -
        (row.iskCost ?? 0) -
        requiredItemsSellCost(row)) /
      row.lpCost,
    enableSorting: true,
    cell: iskPerLpCell,
  },
  {
    id: "jita5pbuy",
    header: "Jita 5% Buy Price",
    accessorFn: (row) => row.marketStats?.buy.percentile,
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jitaBuyVolume",
    header: "Jita Buy Volume",
    accessorFn: (row) => row.marketStats?.buy.volume,
    enableSorting: true,
    cell: volumeCell,
  },
  {
    id: "reqitemsjita5pbuy",
    header: "Required Items Jita 5% Buy",
    accessorFn: requiredItemsBuyCost,
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jita5pbuyprofit",
    header: "Jita 5% Buy Profit",
    accessorFn: (row) =>
      (row.marketStats?.buy.percentile ?? 0) - requiredItemsBuyCost(row),
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "jita5pbuyisklp",
    header: "Jita 5% Buy ISK/LP",
    accessorFn: (row) =>
      ((row.marketStats?.buy.percentile ?? 0) -
        (row.iskCost ?? 0) -
        requiredItemsBuyCost(row)) /
      row.lpCost,
    enableSorting: true,
    cell: iskPerLpCell,
  },
  {
    id: "jitasplit",
    header: "Jita Split",
    accessorFn: (row) =>
      row.marketStats?.buy && row.marketStats?.sell
        ? (row.marketStats.buy.percentile + row.marketStats.sell.percentile) /
          2
        : undefined,
    enableSorting: true,
    cell: iskAmountCell,
  },
  {
    id: "reqitemsjitasplit",
    header: "Required Items Jita 5% Split",
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
    enableSorting: true,
    cell: iskAmountCell,
  },
];

const INITIAL_SORTING = [{ id: "id", desc: true }];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LoyaltyPointsTable = memo(
  ({ corporations, types, offers }: LoyaltyPointsTableProps) => {
    const sortedCorporations = useMemo(
      () => [...corporations].sort((a, b) => a.name.localeCompare(b.name)),
      [corporations],
    );

    const typeIds = useMemo(() => types.map((type) => type.typeId), [types]);

    const marketStats = useFuzzworkRegionalMarketAggregates(typeIds, 10000002);

    const typeNames = useMemo(() => {
      const map: Record<number, string> = {};
      types.forEach((type) => (map[type.typeId] = type.name));
      return map;
    }, [types]);

    const corporationNames = useMemo(() => {
      const map: Record<number, string> = {};
      corporations.forEach(
        (corporation) => (map[corporation.corporationId] = corporation.name),
      );
      return map;
    }, [corporations]);

    const augmentedOffers = useMemo<AugmentedOffer[]>(
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

    const initialColumnVisibility = useMemo(
      () => ({
        id: false,
        quantity: false,
        corporationId: sortedCorporations.length > 1,
        akCost: offers.some((offer) => !!offer.akCost),
        reqitems5pbuydetailsunit: false,
        reqitems5pbuydetailstotal: false,
        reqitems5pselldetails: false,
        reqitems5pselldetailstotal: false,
        jita5pbuy: false,
        reqitemsjita5pbuy: false,
        jita5pbuyprofit: false,
        jitasplit: false,
        reqitemsjitasplit: false,
        jita5psell: false,
        jita5psellprofit: false,
      }),
      [sortedCorporations.length, offers],
    );

    return (
      <DataTable
        data={augmentedOffers}
        columns={COLUMNS}
        withPagination
        defaultPageSize={25}
        withGlobalFilter
        withColumnVisibility
        initialSorting={INITIAL_SORTING}
        initialColumnVisibility={initialColumnVisibility}
        verticalSpacing="xs"
        withTableBorder
        highlightOnHover
        striped
      />
    );
  },
);
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
