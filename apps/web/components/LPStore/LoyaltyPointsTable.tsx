import React, { memo, useMemo } from "react";
import { Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";

import { GetLoyaltyStoresCorporationIdOffers200Item } from "@jitaspace/esi-client";
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
  offers: (GetLoyaltyStoresCorporationIdOffers200Item & {
    corporationId: number;
  })[];
};

export const LoyaltyPointsTable = memo(
  ({ offers }: LoyaltyPointsTableProps) => {
    const corporationIds = useMemo(
      () => [...new Set(offers.map((offer) => offer.corporationId))],
      [offers],
    );

    const columns = useMemo<
      MRT_ColumnDef<
        GetLoyaltyStoresCorporationIdOffers200Item & {
          corporationId: number;
        }
      >[]
    >(
      () => [
        {
          id: "id",
          header: "Offer ID",
          accessorKey: "offer_id",
          size: 40,
        },
        {
          header: "Corp",
          accessorKey: "corporationId",
          size: 40,
          Filter: ({ column, header, table }) => {
            return (
              <EveEntitySelect
                miw={200}
                entityIds={corporationIds.map((id) => ({ id }))}
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
          size: 40,
        },
        {
          header: "Item",
          accessorKey: "type_id",
          size: 300,
          enableColumnFilter: false,
          Cell: ({ renderedCellValue, row, cell }) => (
            <Group wrap="nowrap">
              <TypeAvatar typeId={row.original.type_id} size="sm" />
              {row.original.quantity !== 1 && (
                <Text size="sm">{row.original.quantity}</Text>
              )}
              <TypeAnchor typeId={row.original.type_id} target="_blank">
                <TypeName
                  span
                  typeId={row.original.type_id}
                  size="sm"
                  lineClamp={1}
                />
              </TypeAnchor>
            </Group>
          ),
        },
        {
          header: "LP Cost",
          accessorKey: "lp_cost",
          size: 40,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => value?.toLocaleString?.(),
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <Text>{row.original.lp_cost.toLocaleString()} LP</Text>
          ),
        },
        {
          header: "ISK Cost",
          accessorKey: "isk_cost",
          size: 40,
          filterVariant: "range-slider",
          mantineFilterRangeSliderProps: {
            label: (value) => <ISKAmount amount={value} />,
          },
          Cell: ({ renderedCellValue, row, cell }) => (
            <ISKAmount amount={row.original.isk_cost ?? 0} />
          ),
        },
        {
          header: "AK Cost",
          accessorKey: "ak_cost",
          size: 40,
          filterVariant: "range-slider",
        },
        {
          header: "Required Items",
          accessorKey: "required_items",
          size: 300,
          enableColumnFilter: false,
          Cell: ({ row, cell }) => (
            <Stack spacing="xs">
              {row.original.required_items.map(({ quantity, type_id }) => (
                <Group wrap="nowrap" key={type_id}>
                  <TypeAvatar typeId={type_id} size="sm" />
                  {row.original.quantity !== 1 && (
                    <Text size="sm">{quantity}</Text>
                  )}
                  <TypeAnchor typeId={type_id} target="_blank">
                    <TypeName span typeId={type_id} size="sm" lineClamp={1} />
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
      data: offers, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
      initialState: {
        density: "xs",
        pagination: {
          pageIndex: 0,
          pageSize: 25,
        },
        columnVisibility: {
          id: false,
          quantity: false,
        },
        showColumnFilters: true,
      },
    });

    return <MantineReactTable table={table} />;
  },
);
LoyaltyPointsTable.displayName = "LoyaltyPointsTable";
