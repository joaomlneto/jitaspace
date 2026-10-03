"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { AttributesIcon } from "@jitaspace/eve-icons";
import { DogmaEffectAnchor } from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";

interface DogmaEffectRow {
  effectId: number;
  name: string | null;
  displayName: string | null;
  numTypeIds: number;
}

export interface PageProps {
  effects: Record<number, DogmaEffectRow>;
}

function nameCell(effect: DogmaEffectRow) {
  return (
    <DogmaEffectAnchor effectId={effect.effectId} target="_blank">
      {effect.name}
    </DogmaEffectAnchor>
  );
}

const columns: DataTableColumn<DogmaEffectRow>[] = [
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
    id: "numTypes",
    header: "# Types",
    accessor: "numTypeIds",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
  },
];

export default function DogmaEffectsPage({ effects }: Readonly<PageProps>) {
  const data = useMemo(() => Object.values(effects), [effects]);

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
