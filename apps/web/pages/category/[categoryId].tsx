import React, { useMemo, type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  Container,
  Group,
  Loader,
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
  getUniverseGroupsGroupId,
  GetUniverseGroupsGroupId200,
  useGetUniverseCategoriesCategoryId,
} from "@jitaspace/esi-client";
import { CategoryBreadcrumbs, GroupAnchor } from "@jitaspace/ui";

import { ESI_BASE_URL } from "~/config/constants";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";

type PageProps = {
  name?: string;
  groups: GetUniverseGroupsGroupId200[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  // FIXME: THIS SHOULD NOT BE NEEDED
  axios.defaults.baseURL = ESI_BASE_URL;

  // When this is true (in preview environments) don't prerender any static pages
  // (faster builds, but slower initial page load)
  if (env.SKIP_BUILD_STATIC_GENERATION === "true") {
    return {
      paths: [],
      fallback: true,
    };
  }

  // Get list of categoryIDs from ESI
  const categories = await getUniverseCategories();

  return {
    paths: (categories.data ?? []).map((categoryId) => ({
      params: {
        categoryId: `${categoryId}`,
      },
    })),
    fallback: true, // if not statically generated, try to confirm if there is a new category
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    axios.defaults.baseURL = ESI_BASE_URL;
    const categoryId = Number(context.params?.categoryId as string);

    // check if the requested category exists
    const categoryIds = await getUniverseCategories();
    if (!categoryIds.data.includes(categoryId)) {
      throw Error("category does not exist");
    }

    // get info about the category
    const category = await getUniverseCategoriesCategoryId(categoryId);
    // get info about its groups
    const groups = await Promise.all(
      category.data.groups.map((groupId) => getUniverseGroupsGroupId(groupId)),
    );

    return {
      props: {
        name: category?.data?.name,
        groups: groups.map((response) => response.data),
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    console.log("no such category");
    return {
      notFound: true,
      revalidate: 3600, // every hour
    };
  }
};

export default function Page({ name, groups }: PageProps) {
  const router = useRouter();
  const categoryId = router.query.categoryId as string;
  const { data: category } = useGetUniverseCategoriesCategoryId(
    parseInt(categoryId),
  );

  const sortedGroups = useMemo(
    () => (groups ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading category information...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <>
      <NextSeo
        title={name}
        openGraph={{
          type: "article",
          title: name,
          //description: name,
          url: `https://www.jita.space/category/${categoryId}`,
          siteName: "Jita",
        }}
        twitter={{
          cardType: "summary",
          site: `https://www.jita.space/category/${categoryId}`,
        }}
        themeColor="#9bb4d0"
      />
      <Container size="md">
        <Stack>
          <Group spacing="xl">
            <Title order={1}>{name}</Title>
          </Group>
          <CategoryBreadcrumbs categoryId={Number(categoryId)} />
          <Stack spacing="xs">
            <Title order={3}>Groups</Title>
            <SimpleGrid
              cols={3}
              spacing="xs"
              breakpoints={[
                { maxWidth: "md", cols: 2 },
                { maxWidth: "xs", cols: 1 },
              ]}
            >
              {sortedGroups.map((group) => (
                <Group key={group.group_id}>
                  <GroupAnchor groupId={group.group_id} key={group.group_id}>
                    <Text>{group.name}</Text>
                  </GroupAnchor>
                </Group>
              ))}
            </SimpleGrid>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
