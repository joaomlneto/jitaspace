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
import type { DataTableColumn } from "@jitaspace/datatable";
import { DataTable } from "@jitaspace/datatable-tanstack";

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

type LpColumn = DataTableColumn<AugmentedOffer>;

// ---------------------------------------------------------------------------
// Derived-value helpers used in multiple accessors
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
// Shared cell renderers — agnostic signature: (row, value) => ReactNode
// ---------------------------------------------------------------------------

function iskAmountCell(_row: AugmentedOffer, value: unknown) {
  const amount = value as number | undefined;
  if (amount === undefined) return null;
  return <ISKAmount inherit ta="right" amount={amount} />;
}

function iskPerLpCell(_row: AugmentedOffer, value: unknown) {
  const amount = value as number | undefined;
  if (amount === undefined) return null;
  return (
    <Text inherit ta="right">
      {amount.toFixed(0)} ISK/LP
    </Text>
  );
}

function volumeCell(_row: AugmentedOffer, value: unknown) {
  const volume = value as number | undefined;
  if (volume === undefined) return null;
  return <Text ta="right">{volume.toLocaleString()}</Text>;
}

// ---------------------------------------------------------------------------
// Factory: required-items price list columns (4 variants, hidden by default)
// ---------------------------------------------------------------------------

type ItemPricer = (
  item: AugmentedOffer["requiredItems"][number],
) => number | undefined;

function makeRequiredItemsPriceColumn(
  id: string,
  header: string,
  getPrice: ItemPricer,
): LpColumn {
  return {
    id,
    header,
    accessor: "requiredItems",
    sortable: false,
    defaultVisible: false,
    cell: (row) => (
      <Stack gap="xs">
        {row.requiredItems.map((item) => {
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

    const showCorporation = sortedCorporations.length > 1;
    const showAkCost = offers.some((offer) => !!offer.akCost);

    const columns = useMemo<LpColumn[]>(
      () => [
        {
          id: "id",
          header: "Offer ID",
          accessor: "offerId",
          sortable: true,
          defaultVisible: false,
        },
        {
          id: "corporationId",
          header: "Corporation",
          // accessor returns the name so global filter + sort work by name
          accessor: (row) => row.corporationName ?? "",
          sortable: true,
          defaultVisible: showCorporation,
          cell: (row) => (
            <Group>
              <Tooltip
                label={
                  <CorporationName
                    corporationId={row.corporationId}
                    lineClamp={1}
                  />
                }
                color="dark"
              >
                <Group wrap="nowrap">
                  <CorporationAvatar
                    corporationId={row.corporationId}
                    size="sm"
                  />
                  <CorporationAnchor
                    corporationId={row.corporationId}
                    target="_blank"
                  >
                    <CorporationName corporationId={row.corporationId} />
                  </CorporationAnchor>
                </Group>
              </Tooltip>
            </Group>
          ),
        },
        {
          id: "quantity",
          header: "Quantity",
          accessor: "quantity",
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: (row) => (
            <Text ta="right">{row.quantity.toLocaleString()}</Text>
          ),
        },
        {
          id: "typeId",
          header: "Item",
          // accessor returns the name so global filter + sort work by name
          accessor: (row) => row.typeName ?? "",
          sortable: true,
          cell: (row) => (
            <Group wrap="nowrap">
              <TypeAvatar typeId={row.typeId} size="sm" />
              {row.quantity !== 1 && <Text size="sm">{row.quantity}</Text>}
              <TypeAnchor typeId={row.typeId} target="_blank">
                <TypeName span typeId={row.typeId} size="sm" />
              </TypeAnchor>
            </Group>
          ),
        },
        {
          id: "lpCost",
          header: "LP Cost",
          accessor: "lpCost",
          sortable: true,
          align: "right",
          cell: (row) => (
            <Text inherit ta="right">
              {row.lpCost.toLocaleString()} LP
            </Text>
          ),
        },
        {
          id: "iskCost",
          header: "ISK Cost",
          accessor: "iskCost",
          sortable: true,
          align: "right",
          cell: (row) => (
            <ISKAmount inherit ta="right" amount={row.iskCost ?? 0} />
          ),
        },
        {
          id: "akCost",
          header: "AK Cost",
          accessor: "akCost",
          sortable: true,
          defaultVisible: showAkCost,
          align: "right",
          cell: (_row, value) => (
            <Text ta="right">
              {(value as number | null)?.toLocaleString() ?? ""}
            </Text>
          ),
        },
        {
          id: "requiredItems",
          header: "Required Items",
          accessor: "requiredItems",
          sortable: false,
          cell: (row) => (
            <Stack gap="xs">
              {row.requiredItems.map(({ quantity, typeId }) => (
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
          accessor: (row) => row.marketStats?.sell.percentile,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jitaSellVolume",
          header: "Jita Sell Volume",
          accessor: (row) => row.marketStats?.sell.volume,
          sortable: true,
          align: "right",
          cell: volumeCell,
        },
        {
          id: "reqitemsjita5psell",
          header: "Required Items Jita 5% Sell",
          accessor: requiredItemsSellCost,
          sortable: true,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5psellprofit",
          header: "Jita 5% Sell Profit",
          accessor: (row) =>
            (row.marketStats?.sell.percentile ?? 0) -
            requiredItemsSellCost(row),
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5psellisklp",
          header: "Jita 5% Sell ISK/LP",
          accessor: (row) =>
            ((row.marketStats?.sell.percentile ?? 0) -
              (row.iskCost ?? 0) -
              requiredItemsSellCost(row)) /
            row.lpCost,
          sortable: true,
          align: "right",
          cell: iskPerLpCell,
        },
        {
          id: "jita5pbuy",
          header: "Jita 5% Buy Price",
          accessor: (row) => row.marketStats?.buy.percentile,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jitaBuyVolume",
          header: "Jita Buy Volume",
          accessor: (row) => row.marketStats?.buy.volume,
          sortable: true,
          align: "right",
          cell: volumeCell,
        },
        {
          id: "reqitemsjita5pbuy",
          header: "Required Items Jita 5% Buy",
          accessor: requiredItemsBuyCost,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5pbuyprofit",
          header: "Jita 5% Buy Profit",
          accessor: (row) =>
            (row.marketStats?.buy.percentile ?? 0) - requiredItemsBuyCost(row),
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5pbuyisklp",
          header: "Jita 5% Buy ISK/LP",
          accessor: (row) =>
            ((row.marketStats?.buy.percentile ?? 0) -
              (row.iskCost ?? 0) -
              requiredItemsBuyCost(row)) /
            row.lpCost,
          sortable: true,
          align: "right",
          cell: iskPerLpCell,
        },
        {
          id: "jitasplit",
          header: "Jita Split",
          accessor: (row) =>
            row.marketStats?.buy && row.marketStats?.sell
              ? (row.marketStats.buy.percentile +
                  row.marketStats.sell.percentile) /
                2
              : undefined,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "reqitemsjitasplit",
          header: "Required Items Jita 5% Split",
          accessor: (row) =>
            row.requiredItems
              .map(
                (item) =>
                  (((item.marketStats?.buy.percentile ?? 0) +
                    (item.marketStats?.sell.percentile ?? 0)) /
                    2) *
                  (item.quantity ?? 1),
              )
              .reduce((a, b) => a + b, 0),
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
      ],
      [showCorporation, showAkCost],
    );

    return (
      <DataTable
        data={augmentedOffers}
        columns={columns}
        withPagination
        defaultPageSize={25}
        withGlobalFilter
        withColumnVisibility
        initialSort={{ columnId: "id", direction: "desc" }}
        rowId={(row) => row.offerId}
        verticalSpacing="xs"
        withTableBorder
        highlightOnHover
        striped
      />
    );
  },
);
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
