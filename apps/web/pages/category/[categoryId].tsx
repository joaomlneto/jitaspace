import type { ReactElement } from "react";
import React, { useMemo } from "react";
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
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { CategoryBreadcrumbs, GroupAnchor } from "@jitaspace/ui";

import { env } from "~/env";
import { MainLayout } from "~/layouts";

type PageProps = {
  name?: string;
  groups: { groupId: number; name: string }[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  // When this is true (in preview environments) don't prerender any static pages
  // (faster builds, but slower initial page load)
  if (env.SKIP_BUILD_STATIC_GENERATION === "true") {
    return {
      paths: [],
      fallback: true,
    };
  }

  const categories = await prisma.category.findMany({
    select: { categoryId: true },
  });

  return {
    paths: categories.map((category) => ({
      params: {
        categoryId: `${category.categoryId}`,
      },
    })),
    fallback: true, // if not statically generated, try to confirm if there is a new category
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const categoryId = Number(context.params?.categoryId as string);

    const category = await prisma.category.findUniqueOrThrow({
      select: {
        categoryId: true,
        name: true,
        groups: {
          select: {
            groupId: true,
            name: true,
          },
        },
      },
      where: {
        categoryId: categoryId,
      },
    });

    return {
      props: {
        name: category.name,
        groups: category.groups,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // every hour
    };
  }
};

export default function Page({ name, groups }: PageProps) {
  const router = useRouter();
  const categoryId = parseInt(router.query.categoryId as string);

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
          <Group gap="xl">
            <Title order={1}>{name}</Title>
          </Group>
          <CategoryBreadcrumbs categoryId={Number(categoryId)} />
          <Stack gap="xs">
            <Title order={3}>Groups</Title>
            <SimpleGrid spacing="xs" cols={{ base: 1, xs: 2, md: 3 }}>
              {sortedGroups.map((group) => (
                <Group key={group.groupId}>
                  <GroupAnchor groupId={group.groupId} key={group.groupId}>
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

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};
