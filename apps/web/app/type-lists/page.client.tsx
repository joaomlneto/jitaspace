"use client";

import { Container, Group, Stack, Text, Title } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { ItemsIcon } from "@jitaspace/eve-icons";
import { TypeListAnchor } from "@jitaspace/ui";

import type { TypeListRefType } from "~/lib/typeLists";
import { DataTable } from "~/components/DataTable";
import { TypeListRuleSummary } from "~/components/TypeLists";

export interface TypeListRow {
  typeListId: number;
  name: string;
  displayName: string | null;
  displayDescription: string | null;
  /** Number of include rules of each kind. */
  included: Record<TypeListRefType, number>;
  /** Number of exclude rules of each kind. */
  excluded: Record<TypeListRefType, number>;
  memberCount: number;
}

export interface PageProps {
  typeLists: TypeListRow[];
}

const ruleTotal = (counts: Record<TypeListRefType, number>) =>
  counts.category + counts.group + counts.type;

const columns: DataTableColumn<TypeListRow>[] = [
  {
    id: "id",
    header: "ID",
    accessor: "typeListId",
    sortable: true,
    width: 80,
  },
  {
    id: "name",
    header: "Name",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <TypeListAnchor typeListId={row.typeListId}>{row.name}</TypeListAnchor>
    ),
  },
  {
    id: "displayName",
    header: "Display Name",
    accessor: "displayName",
    sortable: true,
  },
  {
    id: "description",
    header: "Description",
    accessor: "displayDescription",
    defaultVisible: false,
  },
  {
    id: "includes",
    header: "Includes",
    accessor: (row) => ruleTotal(row.included),
    sortable: true,
    cell: (row) => <TypeListRuleSummary counts={row.included} />,
  },
  {
    id: "excludes",
    header: "Excludes",
    accessor: (row) => ruleTotal(row.excluded),
    sortable: true,
    cell: (row) => <TypeListRuleSummary counts={row.excluded} />,
  },
  {
    id: "members",
    header: "Members",
    accessor: "memberCount",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
    cell: (row) => row.memberCount.toLocaleString("en-US"),
  },
];

export default function TypeListsPage({ typeLists }: Readonly<PageProps>) {
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <ItemsIcon width={48} />
          <Title>Type Lists</Title>
        </Group>
        <Text c="dimmed" maw={760}>
          Named sets of items the game uses to decide what a rule applies to —
          which ships may enter a site, what fits in a cargo hold, which items
          an industry assembly line discounts. Each list is defined by the
          categories, groups and types it includes, minus those it excludes.
        </Text>
        <DataTable
          data={typeLists}
          columns={columns}
          rowId={(row) => row.typeListId}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={25}
          initialSort={{ columnId: "id", direction: "asc" }}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
