import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Title } from "@mantine/core";
import axios from "axios";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { AttributesIcon } from "@jitaspace/eve-icons";

import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  attributes: Record<
    number,
    {
      attributeId: number;
      name: string | null;
      displayName: string | null;
      numTypeIds: number;
    }
  >;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    const map: Record<
      number,
      {
        attributeId: number;
        name: string | null;
        displayName: string | null;
        numTypeIds: number;
      }
    > = {};

    const attributes = await prisma.dogmaAttribute.findMany({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
      },
    });
    attributes.forEach(
      (attribute) =>
        (map[attribute.attributeId] = {
          ...attribute,
          numTypeIds: 0,
        }),
    );

    const count = await prisma.typeAttribute.groupBy({
      by: "attributeId",
      _count: {
        attributeId: true,
      },
    });
    count.forEach(
      (entry) =>
        (map[entry.attributeId]!.numTypeIds = entry._count.attributeId),
    );

    return {
      props: {
        attributes: map,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 30, // 30 seconds on error
    };
  }
};

export default function Page({ attributes }: PageProps) {
  const data = useMemo(() => Object.values(attributes), []);
  const columns = useMemo<
    MRT_ColumnDef<{
      attributeId: number;
      name: string | null;
      displayName: string | null;
      numTypeIds: number;
    }>[]
  >(
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

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Dogma Attributes" />
      {page}
    </MainLayout>
  );
};