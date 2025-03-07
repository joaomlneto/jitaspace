import type { MRT_ColumnDef } from "mantine-react-table";
import type { ReactElement } from "react";
import React, { useMemo } from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Title } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { AttributesIcon } from "@jitaspace/eve-icons";
import { DogmaEffectAnchor } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

type PageProps = {
  effects: Record<
    number,
    {
      effectId: number;
      name: string | null;
      displayName: string | null;
      numTypeIds: number;
    }
  >;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const map: Record<
      number,
      {
        effectId: number;
        name: string | null;
        displayName: string | null;
        numTypeIds: number;
      }
    > = {};

    const effects = await prisma.dogmaEffect.findMany({
      select: {
        effectId: true,
        name: true,
        displayName: true,
      },
    });
    effects.forEach(
      (effect) =>
        (map[effect.effectId] = {
          ...effect,
          numTypeIds: 0,
        }),
    );

    const count = await prisma.typeEffect.groupBy({
      by: "effectId",
      _count: {
        effectId: true,
      },
    });
    count.forEach(
      (entry) => (map[entry.effectId]!.numTypeIds = entry._count.effectId),
    );

    return {
      props: {
        effects: map,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // at most once per hour
    };
  }
};

export default function Page({ effects }: PageProps) {
  const data = useMemo(() => Object.values(effects), []);
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
        Cell: ({ renderedCellValue, row, cell }) => (
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

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Dogma Effects" />
      {page}
    </MainLayout>
  );
};
