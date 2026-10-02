import { memo, useMemo } from "react";
import { Badge, Group, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
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

import { DataTable } from "~/components/DataTable";

type Contact = AllianceContact & CorporationContact & CharacterContact;
export interface ContactsDataTableProps {
  contacts?: Contact[];
  labels?: { label_id: number; label_name: string }[];
  hideBlockedColumn?: boolean;
  hideWatchedColumn?: boolean;
}

const CONTACT_TYPE_OPTIONS = [
  { value: "character", label: "Character" },
  { value: "corporation", label: "Corporation" },
  { value: "alliance", label: "Alliance" },
  { value: "faction", label: "Faction" },
];

const NO_CONTACTS: Contact[] = [];

const capitalizeFirstLetter = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);

function contactNameCell(contact: Contact) {
  return (
    <Group wrap="nowrap">
      <StandingIndicator standing={contact.standing}>
        <EveEntityAvatar
          entityId={contact.contact_id}
          category={contact.contact_type}
          size="sm"
        />
      </StandingIndicator>
      <EveEntityAnchor
        size="sm"
        entityId={contact.contact_id}
        category={contact.contact_type}
      >
        <EveEntityName
          entityId={contact.contact_id}
          category={contact.contact_type}
        />
      </EveEntityAnchor>
    </Group>
  );
}

function contactWatchedCell(contact: Contact) {
  return contact.is_watched ? (
    <Badge variant="filled" size="xs">
      watched
    </Badge>
  ) : null;
}

function contactBlockedCell(contact: Contact) {
  if (contact.is_blocked === undefined) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        Unknown
      </Text>
    );
  }
  return contact.is_blocked ? "Yes" : "No";
}

function contactStandingsCell(contact: Contact) {
  return <StandingsBadge standing={contact.standing} />;
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

    const columns = useMemo<DataTableColumn<Contact>[]>(
      () => [
        {
          id: "id",
          header: "Contact ID",
          accessor: "contact_id",
          sortable: true,
          defaultVisible: false,
        },
        {
          id: "type",
          header: "Contact Type",
          accessor: "contact_type",
          sortable: true,
          filter: { type: "select", options: CONTACT_TYPE_OPTIONS },
          defaultVisible: false,
          cell: (contact) => capitalizeFirstLetter(contact.contact_type),
        },
        {
          id: "name",
          header: "Contact",
          accessor: "contact_id",
          sortable: true,
          cell: contactNameCell,
        },
        {
          id: "isWatched",
          header: "Watchlist",
          accessor: (contact) => contact.is_watched ?? false,
          sortable: true,
          filter: { type: "boolean" },
          defaultVisible: !hideWatchedColumn,
          cell: contactWatchedCell,
        },
        {
          id: "isBlocked",
          header: "Blocked",
          accessor: "is_blocked",
          sortable: true,
          defaultVisible: !hideBlockedColumn,
          cell: contactBlockedCell,
        },
        {
          id: "labels",
          header: "Labels",
          // The resolved names, so searching for a label finds its contacts.
          accessor: (contact) =>
            contact.label_ids?.map(
              (labelId) => labelName[labelId] ?? String(labelId),
            ),
          filter: { type: "multi-select" },
          cell: (_contact, value) => (
            <Group gap="xs">
              {(value as string[] | undefined)?.map((name) => (
                <Badge size="sm" key={name}>
                  {name}
                </Badge>
              ))}
            </Group>
          ),
        },
        {
          id: "standings",
          header: "Standings",
          accessor: "standing",
          sortable: true,
          filter: { type: "range", min: -10, max: 10, step: 0.1 },
          cell: contactStandingsCell,
        },
      ],
      [labelName, hideBlockedColumn, hideWatchedColumn],
    );

    return (
      <DataTable
        data={contacts ?? NO_CONTACTS}
        columns={columns}
        rowId={(contact) => contact.contact_id}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "standings", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);

ContactsDataTable.displayName = "ContactsDataTable";
