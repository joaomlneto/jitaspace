import { memo } from "react";
import { Box, Group, Text } from "@mantine/core";
import { addDays } from "date-fns";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { RegionalMarketOrder } from "@jitaspace/hooks";
import { EveEntityAnchor, EveEntityName } from "@jitaspace/eve-components";
import { DateHoverCard, TimeAgoText } from "@jitaspace/ui";

import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { DataTable } from "~/components/DataTable";
import classes from "./MarketOrdersDataTable.module.css";

interface MarketOrdersDataTableProps {
  orders: RegionalMarketOrder[];
  sortPriceDescending: boolean;
  /**
   * While loading, the table renders a full page of skeleton rows instead of
   * collapsing to nothing. That keeps it at its final height from the first
   * paint, so the orders arriving later don't push the rest of the page down.
   */
  isLoading?: boolean;
}

/** An ISK price, always with its two decimals so a column of them lines up. */
export function formatIsk(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ISK`;
}

/**
 * How far from its station a buy order accepts sellers. ESI spells it as a
 * keyword or a jump count.
 */
const RANGE_LABELS: Record<RegionalMarketOrder["range"], string> = {
  station: "Station",
  solarsystem: "System",
  region: "Region",
  "1": "1 jump",
  "2": "2 jumps",
  "3": "3 jumps",
  "4": "4 jumps",
  "5": "5 jumps",
  "10": "10 jumps",
  "20": "20 jumps",
  "30": "30 jumps",
  "40": "40 jumps",
};

function rangeLabel(order: RegionalMarketOrder): string {
  // ESI may add a range this enum doesn't know yet; show it as it comes.
  return (
    (RANGE_LABELS as Partial<Record<string, string>>)[order.range] ??
    order.range
  );
}

/** How far a buy order reaches: a station, its system, N jumps, the region. */
function rangeReach(order: RegionalMarketOrder): number {
  if (order.range === "station") return -1;
  if (order.range === "solarsystem") return 0;
  // Past any jump count ESI offers (40).
  if (order.range === "region") return 1000;
  return Number(order.range);
}

/**
 * Cells never wrap: a wrapped cell made every row two or three lines tall on a
 * narrow screen. The table scrolls sideways instead, and only the location,
 * which can run to 60 characters, is cut short.
 */
function nowrap(content: string) {
  return (
    <Text inherit span style={{ whiteSpace: "nowrap" }}>
      {content}
    </Text>
  );
}

/** An order's station or structure, with its system's security status. */
export function OrderLocation({
  order,
  maw,
}: Readonly<{
  order: Pick<RegionalMarketOrder, "location_id" | "system_id">;
  /** Past this width the name is cut short with an ellipsis. */
  maw?: number;
}>) {
  return (
    <Group wrap="nowrap" gap="xs">
      <Box style={{ flexShrink: 0 }}>
        <SolarSystemSecurityStatusBadge solarSystemId={order.system_id} />
      </Box>
      <Box className={classes.truncate} maw={maw}>
        <EveEntityAnchor inherit entityId={order.location_id} target="_blank">
          <EveEntityName inherit entityId={order.location_id} />
        </EveEntityAnchor>
      </Box>
    </Group>
  );
}

function locationCell(order: RegionalMarketOrder) {
  return <OrderLocation order={order} maw={340} />;
}

function dateCell(_order: RegionalMarketOrder, value: unknown) {
  const date = value as Date;
  return (
    <DateHoverCard date={date}>
      <TimeAgoText
        inherit
        date={date}
        addSuffix
        style={{ whiteSpace: "nowrap" }}
      />
    </DateHoverCard>
  );
}

const columns: DataTableColumn<RegionalMarketOrder>[] = [
  {
    id: "orderId",
    header: "Order ID",
    accessor: "order_id",
    sortable: true,
    defaultVisible: false,
  },
  {
    id: "remainingVolume",
    header: "Quantity",
    accessor: "volume_remain",
    sortable: true,
    align: "right",
    cell: (order) => nowrap(order.volume_remain.toLocaleString()),
  },
  {
    id: "price",
    header: "Price",
    accessor: "price",
    sortable: true,
    align: "right",
    cell: (order) => nowrap(formatIsk(order.price)),
  },
  {
    id: "location",
    header: "Location",
    accessor: "location_id",
    sortable: true,
    cell: locationCell,
  },
  {
    id: "duration",
    header: "Duration",
    accessor: "duration",
    sortable: true,
    align: "right",
    cell: (order) => nowrap(`${order.duration} days`),
  },
  {
    id: "range",
    header: "Range",
    // The label is the value, so the table search and the filter's choices
    // (only the ranges present) read as the cells do: "System", not
    // "solarsystem". It sorts by reach instead, where "10 jumps" would
    // otherwise land before "2 jumps".
    accessor: rangeLabel,
    sortAccessor: rangeReach,
    sortable: true,
    cell: (order) => nowrap(rangeLabel(order)),
    filter: { type: "multi-select" },
  },
  {
    id: "issued",
    header: "Issued",
    accessor: (order) => new Date(order.issued),
    sortable: true,
    cell: dateCell,
  },
  {
    id: "expires",
    header: "Expires",
    // An order runs for its own duration (up to 90 days), not a fixed 30.
    accessor: (order): Date => {
      const issued: unknown = order.issued;
      return addDays(
        new Date(typeof issued === "string" ? issued : ""),
        order.duration,
      );
    },
    sortable: true,
    cell: dateCell,
  },
];

export const MarketOrdersDataTable = memo(
  ({
    orders,
    sortPriceDescending,
    isLoading = false,
  }: MarketOrdersDataTableProps) => (
    <DataTable
      data={orders}
      columns={columns}
      rowId={(order) => order.order_id}
      isLoading={isLoading}
      withGlobalFilter
      withColumnVisibility
      withPagination
      defaultPageSize={20}
      initialSort={{
        columnId: "price",
        direction: sortPriceDescending ? "desc" : "asc",
      }}
      verticalSpacing="xs"
      highlightOnHover
      striped
    />
  ),
);
MarketOrdersDataTable.displayName = "MarketOrdersDataTable";
