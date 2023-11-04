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
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { GroupBreadcrumbs, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";


type PageProps = {
  name?: string;
  types: { typeId: number; name: string }[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Do not pre-render any static pages - faster builds, but slower initial page load
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const groupId = Number(context.params?.groupId as string);

    const group = await prisma.group.findUniqueOrThrow({
      select: {
        groupId: true,
        name: true,
        types: {
          select: {
            typeId: true,
            name: true,
          },
        },
      },
      where: {
        groupId: groupId,
      },
    });

    return {
      props: {
        name: group.name,
        types: group.types ?? [],
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    console.log(
      "error generating page for group with id",
      context.params?.groupId,
    );
    return {
      notFound: true,
      revalidate: 3600, // at most once every hour
    };
  }
};

export default function Page({ name, types }: PageProps) {
  const router = useRouter();
  const groupId = router.query.groupId as string;

  const sortedTypes = useMemo(
    () => (types ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [types],
  );

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading group information...</Text>
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
          url: `https://www.jita.space/group/${groupId}`,
          siteName: "Jita",
        }}
        twitter={{
          cardType: "summary",
          site: `https://www.jita.space/group/${groupId}`,
        }}
        themeColor="#9bb4d0"
      />
      <Container size="md">
        <Stack>
          <Group spacing="xl">
            <Title order={1}>{name}</Title>
          </Group>
          <GroupBreadcrumbs groupId={Number(groupId)} />
          <Title order={3}>Types</Title>
          <SimpleGrid
            cols={2}
            spacing="xs"
            breakpoints={[{ maxWidth: "md", cols: 1 }]}
          >
            {sortedTypes.map((type) => (
              <Group noWrap key={type.typeId}>
                <TypeAvatar typeId={type.typeId} size="sm" />
                <TypeAnchor typeId={type.typeId}>
                  <Text>{type.name}</Text>
                </TypeAnchor>
              </Group>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
