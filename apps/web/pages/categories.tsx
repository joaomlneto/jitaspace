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
import axios from "axios";
import { NextSeo } from "next-seo";

import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
  GetUniverseCategoriesCategoryId200,
} from "@jitaspace/esi-client-kubb";
import { CategoryAnchor } from "@jitaspace/ui";

import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  categories: Record<number, GetUniverseCategoriesCategoryId200>;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    const { data: categoryIds } = await getUniverseCategories();

    const categoryResponses = await Promise.all(
      categoryIds.map((categoryId) =>
        getUniverseCategoriesCategoryId(categoryId),
      ),
    );

    const categories: Record<number, GetUniverseCategoriesCategoryId200> = {};
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
        <Title>Categories</Title>
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
