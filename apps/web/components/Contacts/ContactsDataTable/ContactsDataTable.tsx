import type { MRT_Cell, MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { memo, useMemo } from "react";
import { Badge, Group, Text } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type {
  AllianceContact,
  CharacterContact,
  CorporationContact,
} from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
} from "@jitaspace/eve-components";
import { StandingIndicator, StandingsBadge } from "@jitaspace/ui";

type Contact = AllianceContact & CorporationContact & CharacterContact;
export interface ContactsDataTableProps {
  contacts?: Contact[];
  labels?: { label_id: number; label_name: string }[];
  hideBlockedColumn?: boolean;
  hideWatchedColumn?: boolean;
}

const capitalizeFirstLetter = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);

function ContactNameCell({ row }: Readonly<{ row: MRT_Row<Contact> }>) {
  return (
    <Group wrap="nowrap">
      <StandingIndicator standing={row.original.standing}>
        <EveEntityAvatar
          entityId={row.original.contact_id}
          category={row.original.contact_type}
          size="sm"
        />
      </StandingIndicator>
      <EveEntityAnchor
        size="sm"
        entityId={row.original.contact_id}
        category={row.original.contact_type}
      >
        <EveEntityName
          entityId={row.original.contact_id}
          category={row.original.contact_type}
        />
      </EveEntityAnchor>
    </Group>
  );
}

function ContactWatchedCell({ cell }: Readonly<{ cell: MRT_Cell<Contact> }>) {
  return cell.getValue<boolean>() ? (
    <Badge variant="filled" size="xs">
      watched
    </Badge>
  ) : null;
}

function ContactBlockedCell({ cell }: Readonly<{ cell: MRT_Cell<Contact> }>) {
  const isBlocked = cell.getValue<boolean | undefined>();
  if (isBlocked !== undefined) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        Unknown
      </Text>
    );
  }
  // Only reached when `isBlocked` is undefined.
  return "No";
}

function ContactStandingsCell({ cell }: Readonly<{ cell: MRT_Cell<Contact> }>) {
  return <StandingsBadge standing={cell.getValue<number>()} />;
}

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
          filterVariant: "select",
          Cell: ({ cell }) => capitalizeFirstLetter(cell.getValue<string>()),
        },
        {
          id: "name",
          header: "Contact",
          accessorKey: "contact_id",
          size: 40,
          Cell: ContactNameCell,
        },
        {
          id: "isWatched",
          header: "Watchlist",
          accessorFn: (row) => row.is_watched ?? false,
          filterVariant: "checkbox",
          Cell: ContactWatchedCell,
        },
        {
          id: "isBlocked",
          header: "Blocked",
          accessorKey: "is_blocked",
          Cell: ContactBlockedCell,
        },
        {
          id: "labels",
          header: "Labels",
          accessorKey: "label_ids",
          Cell: ({ cell }) => (
            <Group gap="xs">
              {cell.getValue<number[]>().map((labelId) => (
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
          filterVariant: "range-slider",
          filterFn: "betweenInclusive",
          mantineFilterRangeSliderProps: {
            min: -10,
            max: 10,
            step: 0.1,
          },
          Cell: ContactStandingsCell,
        },
      ],
      [labelName],
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
