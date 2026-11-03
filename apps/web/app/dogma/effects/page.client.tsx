"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Title, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { AttributesIcon } from "@jitaspace/eve-icons";

import type { EffectCategories } from "~/lib/dogmaEffectCategory";
import { DogmaEffectAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { effectCategoryLabelById } from "~/lib/dogmaEffectCategory";

interface DogmaEffectRow {
  effectId: number;
  name: string | null;
  displayName: string | null;
  effectCategoryId: number | null;
  numTypeIds: number;
}

export interface PageProps {
  effects: Record<number, DogmaEffectRow>;
  /** Every effect category, keyed by id; rows carry only the id. */
  categories: EffectCategories;
}

/** A row plus its category's label, which the column filters and sorts on. */
type EffectTableRow = DogmaEffectRow & { categoryLabel: string | null };

function nameCell(effect: EffectTableRow) {
  return (
    <DogmaEffectAnchor effectId={effect.effectId} target="_blank">
      {effect.name}
    </DogmaEffectAnchor>
  );
}

function columnsFor(
  categories: EffectCategories,
): DataTableColumn<EffectTableRow>[] {
  const categoryCell = (effect: EffectTableRow) => {
    const description =
      effect.effectCategoryId === null
        ? null
        : (categories[effect.effectCategoryId]?.customDescription ?? null);
    return (
      <Tooltip
        label={description}
        disabled={!description}
        multiline
        w={320}
        withArrow
      >
        <span>{effect.categoryLabel}</span>
      </Tooltip>
    );
  };
  return [
    {
      id: "id",
      header: "Effect ID",
      accessor: "effectId",
      sortable: true,
    },
    {
      id: "name",
      header: "Name",
      accessor: "name",
      sortable: true,
      cell: nameCell,
    },
    {
      id: "displayName",
      header: "Display Name",
      accessor: "displayName",
      sortable: true,
    },
    {
      id: "category",
      header: "Category",
      accessor: "categoryLabel",
      sortable: true,
      filter: { type: "multi-select" },
      cell: categoryCell,
    },
    {
      id: "numTypes",
      header: "# Types",
      accessor: "numTypeIds",
      sortable: true,
      filter: { type: "range", min: 0 },
      align: "right",
    },
  ];
}

export default function DogmaEffectsPage({
  effects,
  categories,
}: Readonly<PageProps>) {
  const data = useMemo(
    () =>
      Object.values(effects).map((effect) => ({
        ...effect,
        categoryLabel: effectCategoryLabelById(
          categories,
          effect.effectCategoryId,
        ),
      })),
    [effects, categories],
  );
  const columns = useMemo(() => columnsFor(categories), [categories]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AttributesIcon width={48} />
          <Title>Dogma Effects</Title>
        </Group>
        <DataTable
          data={data}
          columns={columns}
          rowId={(effect) => effect.effectId}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={25}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
