"use client";

import { useMemo } from "react";
import { Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeListAnchor } from "@jitaspace/ui";

import type { NamedTypeListMatch } from "~/lib/typeLists";
import { DataTable } from "~/components/DataTable";
import { TYPE_LIST_REF_TYPE_LABELS } from "~/lib/typeLists";
import { TypeListMatchBadges } from "./TypeListMatchBadges";

const nameColumn: DataTableColumn<NamedTypeListMatch> = {
  id: "name",
  header: "List",
  accessor: (row) => row.displayName ?? row.name,
  sortable: true,
  cell: (row) => (
    <Stack gap={0}>
      <TypeListAnchor typeListId={row.typeListId}>
        {row.displayName ?? row.name}
      </TypeListAnchor>
      {row.displayName !== null && (
        <Text size="xs" c="dimmed" ff="monospace">
          {row.name}
        </Text>
      )}
    </Stack>
  ),
};

const includedByColumn: DataTableColumn<NamedTypeListMatch> = {
  id: "includedBy",
  header: "Included By",
  accessor: (row) =>
    row.includedBy.map((refType) => TYPE_LIST_REF_TYPE_LABELS[refType]),
  filter: { type: "multi-select" },
  cell: (row) => <TypeListMatchBadges refTypes={row.includedBy} />,
};

const excludedByColumn: DataTableColumn<NamedTypeListMatch> = {
  id: "excludedBy",
  header: "Excluded By",
  accessor: (row) =>
    row.excludedBy.map((refType) => TYPE_LIST_REF_TYPE_LABELS[refType]),
  filter: { type: "multi-select" },
  cell: (row) => <TypeListMatchBadges refTypes={row.excludedBy} color="red" />,
};

/** The type lists one item matches, with the kinds of rule that matched it. */
export function TypeListMatchTable({
  typeLists,
}: Readonly<{ typeLists: NamedTypeListMatch[] }>) {
  const withExclusions = typeLists.some(
    (typeList) => typeList.excludedBy.length > 0,
  );
  const columns = useMemo(
    () =>
      withExclusions
        ? [nameColumn, includedByColumn, excludedByColumn]
        : [nameColumn, includedByColumn],
    [withExclusions],
  );
  const many = typeLists.length > 10;

  return (
    <DataTable
      data={typeLists}
      columns={columns}
      rowId={(row) => row.typeListId}
      withGlobalFilter={many}
      withPagination={many}
      defaultPageSize={10}
      initialSort={{ columnId: "name", direction: "asc" }}
      verticalSpacing="xs"
      highlightOnHover
      striped
    />
  );
}
