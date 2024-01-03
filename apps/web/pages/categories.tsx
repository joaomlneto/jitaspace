import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { ItemsIcon } from "@jitaspace/eve-icons";
import { CategoryAnchor } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";


type PageProps = {
  categories: { categoryId: number; name: string }[];
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        categoryId: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      props: {
        categories,
      },
      revalidate: 24 * 3600,
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // every hour
    };
  }
};

export default function Page({ categories }: PageProps) {
  return (
    <Container size="md">
      <Stack>
        <Group>
          <ItemsIcon width={48} />
          <Title>Categories</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="xs">
          {categories.map((category) => (
            <Group key={category.categoryId}>
              <CategoryAnchor categoryId={category.categoryId}>
                <Text>{category.name}</Text>
              </CategoryAnchor>
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Categories" />
      {page}
    </MainLayout>
  );
};
