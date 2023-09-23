import React, { memo, useMemo } from "react";
import { Group } from "@mantine/core";
import { addDays } from "date-fns";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

import { GetMarketsRegionIdOrders200Item } from "@jitaspace/esi-client";
import {
  EveEntityName,
  SolarSystemSecurityStatusBadge,
  TimeAgoText,
} from "@jitaspace/ui";

type MarketOrdersDataTableProps = {
  orders: GetMarketsRegionIdOrders200Item[];
};

export const MarketOrdersDataTable = memo(
  ({ orders }: MarketOrdersDataTableProps) => {
    const columns = useMemo<MRT_ColumnDef<GetMarketsRegionIdOrders200Item>[]>(
      () => [
        {
          id: "orderId",
          header: "Order ID",
          accessorKey: "order_id",
          size: 40,
        },
        {
          id: "remainingVolume",
          header: "Remaining Volume",
          accessorKey: "volume_remain",
          size: 40,
          mantineTableHeadCellProps: {
            align: "right",
          },
          mantineTableBodyCellProps: {
            align: "right",
          },
          Cell: ({ renderedCellValue, row, cell }) =>
            row.original.volume_remain.toLocaleString(),
        },
        {
          id: "price",
          header: "Price",
          accessorKey: "price",
          size: 40,
          mantineTableHeadCellProps: {
            align: "right",
          },
          mantineTableBodyCellProps: {
            align: "right",
          },
          Cell: ({ renderedCellValue, row, cell }) =>
            `${row.original.price.toLocaleString()} ISK`,
        },
        {
          id: "location",
          header: "Location",
          accessorKey: "location_id",
          Cell: ({ renderedCellValue, row, cell }) => (
            <Group noWrap>
              <SolarSystemSecurityStatusBadge
                solarSystemId={row.original.system_id}
              />
              <EveEntityName entityId={row.original.location_id} />
            </Group>
          ),
        },
        {
          id: "duration",
          header: "Duration",
          accessorKey: "duration",
        },
        {
          id: "range",
          header: "Range",
          accessorKey: "range",
        },
        {
          id: "issued",
          header: "Issued",
          accessorKey: "issued",
          Cell: ({ renderedCellValue, row, cell }) => (
            <TimeAgoText date={new Date(row.original.issued)} addSuffix />
          ),
        },
        {
          id: "expires",
          header: "Expires",
          accessorFn: (row) => {
            console.log(row);
            return addDays(new Date(row.issued), 30);
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <TimeAgoText date={cell.getValue<Date>()} addSuffix />
          ),
        },
        /*
        {
          id: "json",
          header: "JSON",
          Cell: ({ renderedCellValue, row, cell }) => (
            <JsonInput
              value={JSON.stringify(row.original, null, 2)}
              autosize
              maxRows={5}
            />
          ),
        },*/
      ],
      [],
    );

    const table = useMantineReactTable({
      columns,
      positionPagination: "top",
      enableFacetedValues: true,
      data: orders,
      initialState: {
        density: "xs",
        pagination: {
          pageIndex: 0,
          pageSize: 25,
        },
        columnVisibility: {
          orderId: false,
        },
      },
    });

    return <MantineReactTable table={table} />;
  },
);
MarketOrdersDataTable.displayName = "MarketOrdersDataTable";
