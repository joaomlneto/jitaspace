import React, { memo, useMemo } from "react";
import { Badge, Group, Text } from "@mantine/core";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

import {
  AllianceContact,
  CharacterContact,
  CorporationContact,
} from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
  StandingIndicator,
  StandingsBadge,
} from "@jitaspace/ui";





type Contact = AllianceContact & CorporationContact & CharacterContact;
export type ContactsDataTableProps = {
  contacts?: Contact[];
  labels?: { label_id: number; label_name: string }[];
  hideBlockedColumn?: boolean;
  hideWatchedColumn?: boolean;
};

export const ContactsDataTable = memo(
  ({
    contacts,
    labels,
    hideBlockedColumn = false,
    hideWatchedColumn = false,
  }: ContactsDataTableProps) => {
    const labelName = useMemo(() => {
      const labelName: Record<number, string> = {};
      labels?.forEach(
        (label) => (labelName[label.label_id] = label.label_name),
      );
      return labelName;
    }, [labels]);

    const columns = useMemo<MRT_ColumnDef<Contact>[]>(
      () => [
        {
          id: "id",
          header: "Contact ID",
          accessorKey: "contact_id",
          size: 40,
        },
        {
          id: "type",
          header: "Contact Type",
          accessorKey: "contact_type",
          size: 40,
        },
        {
          id: "name",
          header: "Contact",
          accessorKey: "contact_id",
          size: 40,
          Cell: ({ row }) => (
            <Group noWrap>
              <StandingIndicator standing={row.original.standing}>
                <EveEntityAvatar
                  entityId={row.original.contact_id}
                  category={row.original.contact_type}
                  size="sm"
                />
              </StandingIndicator>
              <EveEntityAnchor
                entityId={row.original.contact_id}
                category={row.original.contact_type}
              >
                <EveEntityName
                  entityId={row.original.contact_id}
                  category={row.original.contact_type}
                />
              </EveEntityAnchor>
            </Group>
          ),
        },
        {
          id: "isWatched",
          header: "Watchlist",
          accessorKey: "is_watched",
          Cell: ({ cell }) =>
            cell.getValue<boolean>() ? (
              <Badge variant="filled" size="xs">
                watched
              </Badge>
            ) : null,
        },
        {
          id: "isBlocked",
          header: "Blocked",
          accessorKey: "is_blocked",
          Cell: ({ cell }) => {
            const isBlocked = cell.getValue<boolean | undefined>();
            if (isBlocked === undefined) {
              return (
                <Text color="dimmed" fs="italic">
                  Unknown
                </Text>
              );
            }
            return isBlocked ? "Yes" : "No";
          },
        },
        {
          id: "labels",
          header: "Labels",
          accessorKey: "label_ids",
          Cell: ({ cell }) => (
            <Group spacing="xs">
              {cell.getValue<number[]>()?.map((labelId) => (
                <Badge size="sm" key={labelId}>
                  {labelName[labelId] ?? JSON.stringify(cell.getValue())}
                </Badge>
              ))}
            </Group>
          ),
        },
        {
          id: "standings",
          header: "Standings",
          accessorKey: "standing",
          Cell: ({ cell }) => (
            <StandingsBadge standing={cell.getValue<number>()} size="sm" />
          ),
        },
      ],
      [],
    );

    const table = useMantineReactTable({
      columns,
      positionPagination: "top",
      enableFacetedValues: true,
      data: contacts ?? [], //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
      initialState: {
        density: "xs",
        sorting: [{ id: "standings", desc: true }],
        pagination: {
          pageIndex: 0,
          pageSize: 25,
        },
        columnVisibility: {
          id: false,
          type: false,
          isBlocked: !hideBlockedColumn,
          isWatched: !hideWatchedColumn,
        },
      },
    });

    return <MantineReactTable table={table} />;
  },
);