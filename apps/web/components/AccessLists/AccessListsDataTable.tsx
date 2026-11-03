"use client";

import { memo, useMemo } from "react";
import { Anchor, Badge, Group, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";

import type { AccessListRow } from "./accessListRows";
import { DataTable } from "~/components/DataTable";
import { AccessBadge } from "./AccessBadge";
import { ACCESS_ORDER } from "./accessListRows";
import classes from "./AccessLists.module.css";

export interface AccessListsDataTableProps {
  accessLists: AccessListRow[];
  /** Called when a list's name is activated, to show its details. */
  onOpen: (accessListId: number) => void;
  /** Whether more than one character can read lists, so the column says whose. */
  showManagers: boolean;
  isLoading?: boolean;
  emptyText?: string;
}

const ROLE_OPTIONS = ACCESS_ORDER.slice(0, 2).map((access) => ({
  value: access,
  label: access,
}));

const accessListRowId = (row: AccessListRow) => row.id;

function AccessListNameCell({
  row,
  onOpen,
}: Readonly<{ row: AccessListRow; onOpen: (accessListId: number) => void }>) {
  return (
    <Stack gap={2} maw={480}>
      {/*
       * A button, not a row click: it is reachable by keyboard and announced
       * as something that opens the list.
       */}
      <Anchor
        component="button"
        type="button"
        size="sm"
        fw={500}
        ta="left"
        onClick={() => onOpen(row.id)}
      >
        {row.name || `Access list ${row.id}`}
      </Anchor>
      {row.description && (
        <Text size="xs" lineClamp={2} className={classes.secondary}>
          {row.description}
        </Text>
      )}
    </Stack>
  );
}

/** The name column's renderer, bound to the table's `onOpen`. */
function nameCellFor(onOpen: (accessListId: number) => void) {
  return function nameCell(row: AccessListRow) {
    return <AccessListNameCell row={row} onOpen={onOpen} />;
  };
}

function managersCell(row: AccessListRow) {
  return (
    <Stack gap={4}>
      {/*
       * Each line wraps, so in a narrow column the badge drops below the
       * name rather than spilling into the next cell.
       */}
      {row.managers.map((manager) => (
        <Group key={manager.characterId} gap={6}>
          <Group gap={6} wrap="nowrap">
            <EveEntityAvatar
              entityId={manager.characterId}
              category="character"
              size={20}
            />
            <Text size="sm" span className={classes.nowrap}>
              <EveEntityName
                span
                inherit
                entityId={manager.characterId}
                category="character"
              />
            </Text>
          </Group>
          {manager.access && (
            <AccessBadge
              access={manager.access}
              size="xs"
              className={classes.nowrap}
            />
          )}
        </Group>
      ))}
    </Stack>
  );
}

function rolesCell(row: AccessListRow) {
  return (
    <Group gap={4}>
      {row.managerRoles.map((access) => (
        <AccessBadge key={access} access={access} size="sm" />
      ))}
    </Group>
  );
}

function everyoneCell(row: AccessListRow) {
  return row.allowEveryone ? (
    <Badge variant="light" color="teal" size="sm">
      Everyone
    </Badge>
  ) : (
    <Text size="sm" className={classes.secondary}>
      Members only
    </Text>
  );
}

export const AccessListsDataTable = memo(
  ({
    accessLists,
    onOpen,
    showManagers,
    isLoading = false,
    emptyText,
  }: AccessListsDataTableProps) => {
    const columns = useMemo<DataTableColumn<AccessListRow>[]>(
      () => [
        {
          id: "id",
          header: "ID",
          accessor: "id",
          sortable: true,
          defaultVisible: false,
        },
        {
          id: "name",
          header: "Name",
          accessor: "name",
          sortable: true,
          cell: nameCellFor(onOpen),
        },
        {
          // Hidden, but the search box still matches it.
          id: "description",
          header: "Description",
          accessor: "description",
          defaultVisible: false,
        },
        showManagers
          ? {
              id: "managers",
              header: "Managed by",
              accessor: "managerRoles",
              filter: { type: "multi-select", options: ROLE_OPTIONS },
              enableHiding: false,
              cell: managersCell,
            }
          : {
              id: "managers",
              header: "Your role",
              accessor: "managerRoles",
              filter: { type: "multi-select", options: ROLE_OPTIONS },
              cell: rolesCell,
            },
        {
          id: "allowEveryone",
          header: "Open to",
          accessor: "allowEveryone",
          sortable: true,
          filter: { type: "boolean" },
          cell: everyoneCell,
        },
        {
          id: "allowed",
          header: "Allowed",
          accessor: "allowedCount",
          sortable: true,
          align: "right",
          filter: { type: "range", min: 0 },
        },
        {
          id: "blocked",
          header: "Blocked",
          accessor: "blockedCount",
          sortable: true,
          align: "right",
          filter: { type: "range", min: 0 },
        },
        {
          id: "characters",
          header: "Characters",
          accessor: "characterCount",
          sortable: true,
          align: "right",
          defaultVisible: false,
        },
        {
          id: "corporations",
          header: "Corporations",
          accessor: "corporationCount",
          sortable: true,
          align: "right",
          defaultVisible: false,
        },
        {
          id: "alliances",
          header: "Alliances",
          accessor: "allianceCount",
          sortable: true,
          align: "right",
          defaultVisible: false,
        },
      ],
      [onOpen, showManagers],
    );

    return (
      <DataTable
        data={accessLists}
        columns={columns}
        rowId={accessListRowId}
        isLoading={isLoading}
        emptyText={emptyText}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "name", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);

AccessListsDataTable.displayName = "AccessListsDataTable";
