import _React, { memo, useMemo } from "react";
import { Group } from "@mantine/core";
import { addDays } from "date-fns";
import type {
  MRT_ColumnDef} from "mantine-react-table";
import {
  MantineReactTable,
  useMantineReactTable,
} from "mantine-react-table";

import type { RegionalMarketOrder } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityName,
  SolarSystemSecurityStatusBadge,
  TimeAgoText,
} from "@jitaspace/ui";





interface MarketOrdersDataTableProps {
  orders: RegionalMarketOrder[];
  sortPriceDescending: boolean;
}

export const MarketOrdersDataTable = memo(
  ({ orders, sortPriceDescending }: MarketOrdersDataTableProps) => {
    const columns = useMemo<MRT_ColumnDef<RegionalMarketOrder>[]>(
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
          Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) =>
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
          Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) =>
            `${row.original.price.toLocaleString()} ISK`,
        },
        {
          id: "location",
          header: "Location",
          accessorKey: "location_id",
          Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) => (
            <Group wrap="nowrap">
              <SolarSystemSecurityStatusBadge
                solarSystemId={row.original.system_id}
              />
              <EveEntityAnchor
                inherit
                entityId={row.original.location_id}
                target="_blank"
              >
                <EveEntityName inherit entityId={row.original.location_id} />
              </EveEntityAnchor>
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
          Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) => (
            <TimeAgoText
              inherit
              date={new Date(row.original.issued)}
              addSuffix
            />
          ),
        },
        {
          id: "expires",
          header: "Expires",
          accessorFn: (row) => {
            console.log(row);
            return addDays(new Date(row.issued), 30);
          },
          Cell: ({ renderedCellValue: _renderedCellValue, row: _row, cell }) => (
            <TimeAgoText inherit date={cell.getValue<Date>()} addSuffix />
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
          pageSize: 20,
        },
        columnVisibility: {
          orderId: false,
        },
        sorting: [{ id: "price", desc: sortPriceDescending }],
      },
    });

    return <MantineReactTable table={table} />;
  },
);
MarketOrdersDataTable.displayName = "MarketOrdersDataTable";
