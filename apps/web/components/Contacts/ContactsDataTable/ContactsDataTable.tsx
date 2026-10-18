import { memo, useMemo } from "react";
import { Badge, Group, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { StandingIndicator, StandingsBadge } from "@jitaspace/ui";

import type { ContactRow } from "../contactRows";
import { EveEntityAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { contactRowKey } from "../contactRows";

export interface ContactsDataTableProps {
  contacts?: ContactRow[];
  /**
   * Show which character, corporation or alliance each contact belongs to.
   * Pointless with a single source — it would repeat the same name on every
   * row — so the page turns it on only when there is more than one.
   */
  showSourceColumn?: boolean;
  isLoading?: boolean;
}

const CONTACT_TYPE_OPTIONS = [
  { value: "character", label: "Character" },
  { value: "corporation", label: "Corporation" },
  { value: "alliance", label: "Alliance" },
  { value: "faction", label: "Faction" },
];

const NO_CONTACTS: ContactRow[] = [];

const capitalizeFirstLetter = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);

function contactSourceCell(contact: ContactRow) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EveEntityAvatar
        entityId={contact.source.subjectId}
        category={contact.source.kind}
        size="sm"
      />
      <EveEntityAnchor
        size="sm"
        entityId={contact.source.subjectId}
        category={contact.source.kind}
      >
        <EveEntityName
          entityId={contact.source.subjectId}
          category={contact.source.kind}
        />
      </EveEntityAnchor>
    </Group>
  );
}

function contactNameCell(contact: ContactRow) {
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

function contactWatchedCell(contact: ContactRow) {
  return contact.is_watched ? (
    <Badge variant="filled" size="xs">
      watched
    </Badge>
  ) : null;
}

function contactBlockedCell(contact: ContactRow) {
  // Only characters can block a contact; corporations and alliances have no
  // blocked list, so there is nothing to show rather than something unknown.
  if (contact.source.kind !== "character") return null;
  if (contact.is_blocked === undefined) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        Unknown
      </Text>
    );
  }
  return contact.is_blocked ? "Yes" : "No";
}

function contactLabelsCell(contact: ContactRow) {
  return (
    <Group gap="xs">
      {contact.labelNames.map((name) => (
        <Badge size="sm" key={name}>
          {name}
        </Badge>
      ))}
    </Group>
  );
}

function contactStandingsCell(contact: ContactRow) {
  return <StandingsBadge standing={contact.standing} />;
}

export const ContactsDataTable = memo(
  ({
    contacts,
    showSourceColumn = false,
    isLoading = false,
  }: ContactsDataTableProps) => {
    const columns = useMemo<DataTableColumn<ContactRow>[]>(
      () => [
        ...(showSourceColumn
          ? [
              {
                id: "source",
                header: "Source",
                accessor: (contact) => contact.source.subjectId,
                sortable: true,
                cell: contactSourceCell,
              } satisfies DataTableColumn<ContactRow>,
            ]
          : []),
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
          cell: contactWatchedCell,
        },
        {
          id: "isBlocked",
          header: "Blocked",
          accessor: "is_blocked",
          sortable: true,
          cell: contactBlockedCell,
        },
        {
          id: "labels",
          header: "Labels",
          // The resolved names, so searching for a label finds its contacts.
          accessor: "labelNames",
          filter: { type: "multi-select" },
          cell: contactLabelsCell,
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
      [showSourceColumn],
    );

    return (
      <DataTable
        data={contacts ?? NO_CONTACTS}
        columns={columns}
        // The same contact can appear once per source, so the contact id
        // alone is not unique in a merged list.
        rowId={contactRowKey}
        isLoading={isLoading}
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
