"use client";

import type { MRT_ColumnDef } from "mantine-react-table";
import { useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { AttributesIcon } from "@jitaspace/eve-icons";
import { DogmaEffectAnchor } from "@jitaspace/ui";

export interface PageProps {
  effects: Record<
    number,
    {
      effectId: number;
      name: string | null;
      displayName: string | null;
      numTypeIds: number;
    }
  >;
}

export default function DogmaEffectsPage({ effects }: PageProps) {
  const data = useMemo(() => Object.values(effects), [effects]);
  const columns = useMemo<
    MRT_ColumnDef<{
      effectId: number;
      name: string | null;
      displayName: string | null;
      numTypeIds: number;
    }>[]
  >(
    () => [
      {
        id: "id",
        header: "Effect ID",
        accessorKey: "effectId",
        size: 40,
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        size: 40,
        Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) => (
          <DogmaEffectAnchor effectId={row.original.effectId} target="_blank">
            {row.original.name}
          </DogmaEffectAnchor>
        ),
      },
      {
        id: "displayName",
        header: "Display Name",
        accessorKey: "displayName",
        size: 40,
      },
      {
        id: "numTypes",
        header: "# Types",
        accessorKey: "numTypeIds",
        size: 40,
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    positionPagination: "top",
    enableFacetedValues: true,
    data,
    initialState: {
      density: "xs",
      showColumnFilters: true,
    },
  });

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AttributesIcon width={48} />
          <Title>Dogma Effects</Title>
        </Group>
        <MantineReactTable table={table} />
      </Stack>
    </Container>
  );
}
