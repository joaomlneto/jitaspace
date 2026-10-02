"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { AttributesIcon } from "@jitaspace/eve-icons";
import { DogmaAttributeAnchor } from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";

interface DogmaAttributeRow {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  numTypeIds: number;
}

export interface PageProps {
  attributes: Record<number, DogmaAttributeRow>;
}

function nameCell(attribute: DogmaAttributeRow) {
  return (
    <DogmaAttributeAnchor attributeId={attribute.attributeId} target="_blank">
      {attribute.name}
    </DogmaAttributeAnchor>
  );
}

const columns: DataTableColumn<DogmaAttributeRow>[] = [
  {
    id: "id",
    header: "Attribute ID",
    accessor: "attributeId",
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

export default function DogmaAttributesPage({
  attributes,
}: Readonly<PageProps>) {
  const data = useMemo(() => Object.values(attributes), [attributes]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AttributesIcon width={48} />
          <Title>Dogma Attributes</Title>
        </Group>
        <DataTable
          data={data}
          columns={columns}
          rowId={(attribute) => attribute.attributeId}
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
