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

import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
} from "@jitaspace/esi-client";
import { ItemsIcon } from "@jitaspace/eve-icons";
import { Category } from "@jitaspace/hooks";
import { CategoryAnchor } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";


type PageProps = {
  categories: Record<number, Category>;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const { data: categoryIds } = await getUniverseCategories();

    const categoryResponses = await Promise.all(
      categoryIds.map((categoryId) =>
        getUniverseCategoriesCategoryId(categoryId),
      ),
    );

    const categories: Record<number, Category> = {};
    categoryResponses.forEach(
      (category) => (categories[category.data.category_id] = category.data),
    );

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
  const sortedCategories = Object.values(categories).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Container size="md">
      <Stack>
        <Group>
          <ItemsIcon width={48} />
          <Title>Categories</Title>
        </Group>
        <SimpleGrid
          cols={3}
          spacing="xs"
          breakpoints={[
            { maxWidth: "sm", cols: 2 },
            { maxWidth: "xs", cols: 1 },
          ]}
        >
          {sortedCategories.map((category) => (
            <Group key={category.category_id}>
              <CategoryAnchor categoryId={category.category_id}>
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
