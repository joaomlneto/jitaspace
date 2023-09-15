import React, { memo, useMemo } from "react";
import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
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
                  <CorporationName corporationId={row.original.corporationId} />
                }
                color="dark"
              >
                <div>
                  <CorporationAnchor
                    corporationId={row.original.corporationId}
                    target="_blank"
                  >
                    <ActionIcon size="sm">
                      <CorporationAvatar
                        corporationId={row.original.corporationId}
                        size="sm"
                      />
                    </ActionIcon>
                  </CorporationAnchor>
                </div>
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
          Cell: ({ renderedCellValue, row, cell }) => (
            <Group noWrap>
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
          Cell: ({ renderedCellValue, row, cell }) => renderedCellValue,
        },
        {
          header: "ISK Cost",
          accessorKey: "isk_cost",
          size: 40,
          filterVariant: "range-slider",
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
          Cell: ({ row, cell }) => (
            <Stack spacing="xs">
              {row.original.required_items.map(({ quantity, type_id }) => (
                <Group noWrap key={type_id}>
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
    // {ak_cost?: number, isk_cost: number, lp_cost: number, offer_id: number, quantity: number, required_items: GetLoyaltyStoresCorporationIdOffers200ItemRequiredItemsItem[], type_id: number}

    const table = useMantineReactTable({
      columns,
      positionPagination: "top",
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
