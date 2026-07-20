"use client";

import type { MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { AttributesIcon } from "@jitaspace/eve-icons";
import { DogmaAttributeAnchor } from "@jitaspace/ui";

interface DogmaAttributeRow {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  numTypeIds: number;
}

export interface PageProps {
  attributes: Record<number, DogmaAttributeRow>;
}

function NameCell({ row }: Readonly<{ row: MRT_Row<DogmaAttributeRow> }>) {
  return (
    <DogmaAttributeAnchor
      attributeId={row.original.attributeId}
      target="_blank"
    >
      {row.original.name}
    </DogmaAttributeAnchor>
  );
}

export default function DogmaAttributesPage({
  attributes,
}: Readonly<PageProps>) {
  const data = useMemo(() => Object.values(attributes), [attributes]);
  const columns = useMemo<MRT_ColumnDef<DogmaAttributeRow>[]>(
    () => [
      {
        id: "id",
        header: "Attribute ID",
        accessorKey: "attributeId",
        size: 40,
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        size: 40,
        Cell: NameCell,
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
          <Title>Dogma Attributes</Title>
        </Group>
        <MantineReactTable table={table} />
      </Stack>
    </Container>
  );
}
