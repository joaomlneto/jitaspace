import { memo } from "react";
import { Group } from "@mantine/core";
import { addDays } from "date-fns";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { RegionalMarketOrder } from "@jitaspace/hooks";
import { EveEntityAnchor, EveEntityName } from "@jitaspace/eve-components";
import { DateHoverCard, TimeAgoText } from "@jitaspace/ui";

import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { DataTable } from "~/components/DataTable";

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

function locationCell(order: RegionalMarketOrder) {
  return (
    <Group wrap="nowrap">
      <SolarSystemSecurityStatusBadge solarSystemId={order.system_id} />
      <EveEntityAnchor inherit entityId={order.location_id} target="_blank">
        <EveEntityName inherit entityId={order.location_id} />
      </EveEntityAnchor>
    </Group>
  );
}

function dateCell(_order: RegionalMarketOrder, value: unknown) {
  const date = value as Date;
  return (
    <DateHoverCard date={date}>
      <TimeAgoText inherit date={date} addSuffix />
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
    header: "Remaining Volume",
    accessor: "volume_remain",
    sortable: true,
    align: "right",
    cell: (order) => order.volume_remain.toLocaleString(),
  },
  {
    id: "price",
    header: "Price",
    accessor: "price",
    sortable: true,
    align: "right",
    cell: (order) => `${order.price.toLocaleString()} ISK`,
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
  },
  {
    id: "range",
    header: "Range",
    accessor: "range",
    sortable: true,
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
    accessor: (order): Date => {
      const issued: unknown = order.issued;
      return addDays(new Date(typeof issued === "string" ? issued : ""), 30);
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
