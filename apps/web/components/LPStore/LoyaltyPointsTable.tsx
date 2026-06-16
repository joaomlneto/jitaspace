"use client";

import { memo, useMemo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeAnchor } from "@jitaspace/eve-components";
import {
  CorporationAnchor,
  CorporationAvatar,
  EveEntityNameDisplay,
  ISKAmount,
  TypeAvatar,
} from "@jitaspace/ui";

import type { AugmentedOffer } from "./pricing";
import { DataTable } from "~/components/DataTable";
import { usePreferencesStore } from "~/lib/preferences";
import { LoyaltyPointsTableClassic } from "./LoyaltyPointsTableClassic";
import {
  buyIskPerLp,
  buyProfit,
  requiredItemsBuyCost,
  requiredItemsSellCost,
  requiredItemsSplitCost,
  rewardBuyValue,
  rewardSellValue,
  rewardSplitValue,
  sellIskPerLp,
  sellProfit,
} from "./pricing";
import { useAugmentedOffers } from "./useAugmentedOffers";

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

type LpColumn = DataTableColumn<AugmentedOffer>;

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

function corporationCell(row: AugmentedOffer) {
  return (
    <Group>
      <Tooltip
        label={
          <EveEntityNameDisplay name={row.corporationName} lineClamp={1} />
        }
        color="dark"
      >
        <Group wrap="nowrap">
          <CorporationAvatar corporationId={row.corporationId} size="sm" />
          <CorporationAnchor corporationId={row.corporationId} target="_blank">
            <EveEntityNameDisplay name={row.corporationName} />
          </CorporationAnchor>
        </Group>
      </Tooltip>
    </Group>
  );
}

function quantityCell(row: AugmentedOffer) {
  return <Text ta="right">{row.quantity.toLocaleString()}</Text>;
}

function itemCell(row: AugmentedOffer) {
  return (
    <Group wrap="nowrap">
      <TypeAvatar typeId={row.typeId} size="sm" />
      {row.quantity !== 1 && <Text size="sm">{row.quantity}</Text>}
      <TypeAnchor typeId={row.typeId} target="_blank">
        <EveEntityNameDisplay span name={row.typeName} size="sm" />
      </TypeAnchor>
    </Group>
  );
}

function lpCostCell(row: AugmentedOffer) {
  return (
    <Text inherit ta="right">
      {row.lpCost.toLocaleString()} LP
    </Text>
  );
}

function iskCostCell(row: AugmentedOffer) {
  return <ISKAmount inherit ta="right" amount={row.iskCost} />;
}

function akCostCell(_row: AugmentedOffer, value: unknown) {
  return (
    <Text ta="right">{(value as number | null)?.toLocaleString() ?? ""}</Text>
  );
}

function requiredItemsCell(row: AugmentedOffer) {
  return (
    <Stack gap="xs">
      {row.requiredItems.map(({ quantity, typeId, typeName }) => (
        <Group key={typeId} wrap="nowrap" gap="xs">
          <TypeAvatar typeId={typeId} size="sm" />
          {quantity !== 1 && <Text size="sm">{quantity}</Text>}
          <TypeAnchor typeId={typeId} target="_blank">
            <EveEntityNameDisplay
              span
              name={typeName}
              size="sm"
              lineClamp={1}
            />
          </TypeAnchor>
        </Group>
      ))}
    </Stack>
  );
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
// Experimental component (engine-agnostic, with per-table engine selector)
// ---------------------------------------------------------------------------

const LoyaltyPointsTableExperimental = memo(
  ({ corporations, types, offers }: LoyaltyPointsTableProps) => {
    const { sortedCorporations, augmentedOffers } = useAugmentedOffers({
      corporations,
      types,
      offers,
    });

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
          cell: corporationCell,
        },
        {
          id: "quantity",
          header: "Quantity",
          accessor: "quantity",
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: quantityCell,
        },
        {
          id: "typeId",
          header: "Item",
          // accessor returns the name so global filter + sort work by name
          accessor: (row) => row.typeName ?? "",
          sortable: true,
          cell: itemCell,
        },
        {
          id: "lpCost",
          header: "LP Cost",
          accessor: "lpCost",
          sortable: true,
          align: "right",
          cell: lpCostCell,
        },
        {
          id: "iskCost",
          header: "ISK Cost",
          accessor: "iskCost",
          sortable: true,
          align: "right",
          cell: iskCostCell,
        },
        {
          id: "akCost",
          header: "AK Cost",
          accessor: "akCost",
          sortable: true,
          defaultVisible: showAkCost,
          align: "right",
          cell: akCostCell,
        },
        {
          id: "requiredItems",
          header: "Required Items",
          accessor: "requiredItems",
          sortable: false,
          cell: requiredItemsCell,
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
          accessor: rewardSellValue,
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
          accessor: sellProfit,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5psellisklp",
          header: "Jita 5% Sell ISK/LP",
          accessor: sellIskPerLp,
          sortable: true,
          align: "right",
          cell: iskPerLpCell,
        },
        {
          id: "jita5pbuy",
          header: "Jita 5% Buy Price",
          accessor: rewardBuyValue,
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
          accessor: buyProfit,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "jita5pbuyisklp",
          header: "Jita 5% Buy ISK/LP",
          accessor: buyIskPerLp,
          sortable: true,
          align: "right",
          cell: iskPerLpCell,
        },
        {
          id: "jitasplit",
          header: "Jita Split",
          accessor: rewardSplitValue,
          sortable: true,
          defaultVisible: false,
          align: "right",
          cell: iskAmountCell,
        },
        {
          id: "reqitemsjitasplit",
          header: "Required Items Jita 5% Split",
          accessor: requiredItemsSplitCost,
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
LoyaltyPointsTableExperimental.displayName = "LoyaltyPointsTableExperimental";

// ---------------------------------------------------------------------------
// Public component — picks the implementation based on the experimental setting.
// OFF (default): the original mantine-react-table table (unchanged behaviour).
// ON: the engine-agnostic table with a per-table engine selector.
// ---------------------------------------------------------------------------

export const LoyaltyPointsTable = memo((props: LoyaltyPointsTableProps) => {
  const experimentalEnabled = usePreferencesStore(
    (state) => state.experimentalDataTables,
  );

  if (!experimentalEnabled) {
    return <LoyaltyPointsTableClassic {...props} />;
  }

  return <LoyaltyPointsTableExperimental {...props} />;
});
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
