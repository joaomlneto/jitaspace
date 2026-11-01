"use client";

import { memo, useMemo } from "react";
import { Group } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityAvatar } from "@jitaspace/eve-components";
import { useEsiNameLookup } from "@jitaspace/hooks";

import type { AccessListMember, AccessListMemberKind } from "./accessListRows";
import { EveEntityAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { AccessBadge } from "./AccessBadge";
import { ACCESS_ORDER, accessRank } from "./accessListRows";
import classes from "./AccessLists.module.css";

export interface AccessListMembersTableProps {
  members: readonly AccessListMember[];
}

interface MemberRow extends AccessListMember {
  /** The resolved name, so the search box and sorting can use it. */
  name: string | null;
}

const KIND_LABELS: Record<AccessListMemberKind, string> = {
  character: "Character",
  corporation: "Corporation",
  alliance: "Alliance",
};

const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const ACCESS_OPTIONS = ACCESS_ORDER.map((access) => ({
  value: access,
  label: access,
}));

// An entity can only be on a list once, but the id spaces of the three kinds
// are separate in principle, so the kind is part of the key.
const memberRowId = (row: MemberRow) => `${row.kind}:${row.entityId}`;

function memberCell(row: MemberRow) {
  return (
    <Group gap="xs" wrap="nowrap">
      <EveEntityAvatar entityId={row.entityId} category={row.kind} size="sm" />
      <EveEntityAnchor size="sm" entityId={row.entityId} category={row.kind}>
        {row.name ?? row.entityId}
      </EveEntityAnchor>
    </Group>
  );
}

const columns: DataTableColumn<MemberRow>[] = [
  {
    id: "member",
    header: "Member",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: memberCell,
  },
  {
    id: "kind",
    header: "Type",
    accessor: "kind",
    sortable: true,
    filter: { type: "select", options: KIND_OPTIONS },
    cell: (row) => KIND_LABELS[row.kind],
  },
  {
    id: "access",
    header: "Access",
    accessor: "access",
    sortable: true,
    sortAccessor: (row) => accessRank(row.access),
    filter: { type: "multi-select", options: ACCESS_OPTIONS },
    cell: (row) => (
      <AccessBadge access={row.access} size="sm" className={classes.nowrap} />
    ),
  },
];

/** Everyone an access list names, searchable by name. */
export const AccessListMembersTable = memo(
  ({ members }: AccessListMembersTableProps) => {
    // Stable for as long as `members` is, so the lookup does not resubscribe.
    const entries = useMemo(
      () =>
        members.map((member) => ({
          id: member.entityId,
          category: member.kind,
        })),
      [members],
    );
    const names = useEsiNameLookup(entries);

    const rows = useMemo<MemberRow[]>(
      () =>
        members.map((member) => ({
          ...member,
          name: names[member.entityId.toString()]?.value?.name ?? null,
        })),
      [members, names],
    );

    return (
      <DataTable
        data={rows}
        columns={columns}
        rowId={memberRowId}
        emptyText="This access list names no one."
        withGlobalFilter
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "access", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);

AccessListMembersTable.displayName = "AccessListMembersTable";
