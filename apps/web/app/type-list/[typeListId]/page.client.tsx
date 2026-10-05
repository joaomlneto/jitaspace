"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Breadcrumbs,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Spoiler,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeAnchor, TypeAvatar } from "@jitaspace/eve-components";
import { CategoryAnchor, GroupAnchor } from "@jitaspace/ui";

import type { TypeListDetail, TypeListRuleDetail } from "./data";
import type { TypeListRefType } from "~/lib/typeLists";
import { DataTable } from "~/components/DataTable";
import { TypeListMatchBadges } from "~/components/TypeLists";
import {
  buildTypeListRuleIndex,
  matchTypeLists,
  TYPE_LIST_REF_TYPE_LABELS,
  TYPE_LIST_REF_TYPES,
} from "~/lib/typeLists";

interface MemberRow {
  typeId: number;
  name: string;
  groupId: number;
  groupName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  published: boolean;
  /** The kinds of include rule that pulled this type in. */
  includedBy: TypeListRefType[];
}

const RULE_SECTION_TITLES: Record<TypeListRefType, string> = {
  category: "Categories",
  group: "Groups",
  type: "Types",
};

const memberColumns: DataTableColumn<MemberRow>[] = [
  {
    id: "typeId",
    header: "Type ID",
    accessor: "typeId",
    sortable: true,
    width: 100,
    defaultVisible: false,
  },
  {
    id: "name",
    header: "Type",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar typeId={row.typeId} size="sm" />
        <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
      </Group>
    ),
  },
  {
    id: "group",
    header: "Group",
    accessor: "groupName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => (
      <GroupAnchor groupId={row.groupId}>
        {row.groupName ?? `Group ${row.groupId}`}
      </GroupAnchor>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessor: "categoryName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.categoryId === null ? null : (
        <CategoryAnchor categoryId={row.categoryId}>
          {row.categoryName ?? `Category ${row.categoryId}`}
        </CategoryAnchor>
      ),
  },
  {
    id: "includedBy",
    header: "Included By",
    accessor: (row) =>
      row.includedBy.map((refType) => TYPE_LIST_REF_TYPE_LABELS[refType]),
    filter: { type: "multi-select" },
    cell: (row) => <TypeListMatchBadges refTypes={row.includedBy} />,
  },
  {
    id: "published",
    header: "Published",
    accessor: "published",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => (
      <Badge size="sm" variant="light" color={row.published ? "teal" : "gray"}>
        {row.published ? "Yes" : "No"}
      </Badge>
    ),
  },
];

function StatCard({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={2}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={700}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Text component="div" fw={600} size="lg">
          {value}
        </Text>
      </Stack>
    </Paper>
  );
}

function RuleRef({ rule }: Readonly<{ rule: TypeListRuleDetail }>) {
  const label =
    rule.name ?? `${TYPE_LIST_REF_TYPE_LABELS[rule.refType]} ${rule.refId}`;
  switch (rule.refType) {
    case "category":
      return <CategoryAnchor categoryId={rule.refId}>{label}</CategoryAnchor>;
    case "group":
      return <GroupAnchor groupId={rule.refId}>{label}</GroupAnchor>;
    case "type":
      return (
        <Group gap={6} wrap="nowrap">
          <TypeAvatar typeId={rule.refId} size="xs" />
          <TypeAnchor typeId={rule.refId}>{label}</TypeAnchor>
        </Group>
      );
  }
}

/** One side of the definition: everything the list includes, or excludes. */
function RulePanel({
  title,
  rules,
  emptyText,
}: Readonly<{
  title: string;
  rules: TypeListRuleDetail[];
  emptyText: string;
}>) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        {rules.length === 0 && (
          <Text size="sm" c="dimmed">
            {emptyText}
          </Text>
        )}
        {TYPE_LIST_REF_TYPES.map((refType) => {
          const ofKind = rules.filter((rule) => rule.refType === refType);
          if (ofKind.length === 0) return null;
          return (
            <Stack key={refType} gap={6}>
              <Text
                size="xs"
                c="dimmed"
                tt="uppercase"
                fw={700}
                style={{ letterSpacing: "0.05em" }}
              >
                {RULE_SECTION_TITLES[refType]} ({ofKind.length})
              </Text>
              <Spoiler maxHeight={200} showLabel="Show all" hideLabel="Hide">
                <Stack gap={4}>
                  {ofKind.map((rule) => (
                    <RuleRef
                      key={`${rule.included}:${rule.refType}:${rule.refId}`}
                      rule={rule}
                    />
                  ))}
                </Stack>
              </Spoiler>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}

export default function TypeListPage({
  typeList,
}: Readonly<{ typeList: TypeListDetail }>) {
  const { rules, members, groups, categories, assemblyLines } = typeList;
  const title = typeList.displayName ?? typeList.name;

  const included = useMemo(
    () => rules.filter((rule) => rule.included),
    [rules],
  );
  const excluded = useMemo(
    () => rules.filter((rule) => !rule.included),
    [rules],
  );

  const memberRows = useMemo<MemberRow[]>(() => {
    // Members arrive already filtered; matching them again only recovers
    // *which* include rules pulled each one in, for the "Included By" column.
    const index = buildTypeListRuleIndex(
      rules.map((rule) => ({ ...rule, typeListId: typeList.typeListId })),
    );
    return members.map(([typeId, name, groupId, published]) => {
      const group = groups[groupId];
      const categoryId = group?.categoryId ?? null;
      const [match] = matchTypeLists(index, {
        typeId,
        groupId,
        categoryId: categoryId ?? -1,
      });
      return {
        typeId,
        name,
        groupId,
        groupName: group?.name ?? null,
        categoryId,
        categoryName:
          categoryId === null ? null : (categories[categoryId] ?? null),
        published,
        includedBy: match?.includedBy ?? [],
      };
    });
  }, [rules, members, groups, categories, typeList.typeListId]);

  const publishedCount = useMemo(
    () => members.filter(([, , , published]) => published).length,
    [members],
  );
  const groupCount = useMemo(
    () => new Set(members.map(([, , groupId]) => groupId)).size,
    [members],
  );

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} href="/type-lists" size="sm">
            Type Lists
          </Anchor>
          <Text size="sm">{title}</Text>
        </Breadcrumbs>

        <Stack gap="xs">
          <Group gap="sm" align="center">
            <Title order={1}>{title}</Title>
            <Badge variant="light" color="gray">
              ID {typeList.typeListId}
            </Badge>
          </Group>
          {typeList.displayName !== null && (
            <Text size="sm" c="dimmed">
              Internal name: <Code>{typeList.name}</Code>
            </Text>
          )}
          {typeList.displayDescription && (
            <Text maw={760}>{typeList.displayDescription}</Text>
          )}
        </Stack>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <StatCard
            label="Members"
            value={members.length.toLocaleString("en-US")}
          />
          <StatCard
            label="Published"
            value={publishedCount.toLocaleString("en-US")}
          />
          <StatCard label="Groups" value={groupCount.toLocaleString("en-US")} />
          <StatCard
            label="Rules"
            value={rules.length.toLocaleString("en-US")}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <RulePanel
            title="Includes"
            rules={included}
            emptyText="This list includes nothing, so it has no members."
          />
          <RulePanel
            title="Excludes"
            rules={excluded}
            emptyText="Nothing is carved out of the included items."
          />
        </SimpleGrid>

        {assemblyLines.length > 0 && (
          <Stack gap="sm">
            <Title order={3}>Industry Assembly Lines</Title>
            <Text size="sm" c="dimmed">
              Assembly lines that apply their own multipliers to jobs for items
              in this list.
            </Text>
            <Paper withBorder radius="md" p="sm">
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Assembly Line</Table.Th>
                    <Table.Th>Activity</Table.Th>
                    <Table.Th ta="right">Material</Table.Th>
                    <Table.Th ta="right">Time</Table.Th>
                    <Table.Th ta="right">Cost</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {assemblyLines.map((line) => (
                    <Table.Tr key={line.industryAssemblyLineId}>
                      <Table.Td>{line.name}</Table.Td>
                      <Table.Td>{line.activityName ?? "—"}</Table.Td>
                      <Table.Td ta="right" ff="monospace">
                        ×{line.materialMultiplier}
                      </Table.Td>
                      <Table.Td ta="right" ff="monospace">
                        ×{line.timeMultiplier}
                      </Table.Td>
                      <Table.Td ta="right" ff="monospace">
                        {line.costMultiplier === null
                          ? "—"
                          : `×${line.costMultiplier}`}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        )}

        <Stack gap="sm">
          <Title order={3}>Members</Title>
          <DataTable
            data={memberRows}
            columns={memberColumns}
            rowId={(row) => row.typeId}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={25}
            initialSort={{ columnId: "name", direction: "asc" }}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      </Stack>
    </Container>
  );
}
