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
  getUniverseGroups,
  getUniverseGroupsGroupId,
  getUniverseTypesTypeId,
  useGetUniverseGroupsGroupId,
} from "@jitaspace/esi-client";
import { GroupBreadcrumbs, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

import { ESI_BASE_URL } from "~/config/constants";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";

type PageProps = {
  name?: string;
  types: { type_id: number; name: string }[];
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

  // Get list of groupIds from ESI
  const firstPage = await getUniverseGroups();
  let groupIds = [...firstPage.data];
  const numPages = firstPage.headers["x-pages"];
  for (let page = 2; page <= numPages; page++) {
    const result = await getUniverseGroups({ page });
    groupIds = [...groupIds, ...result.data];
  }

  return {
    // FIXME: THIS IS TOO SLOW! RE-ENABLE ONCE YOU FIGURE OUT HOW TO MAKE IT QUICKER
    paths: [],
    /*
    paths: groups.data.map((groupId) => ({
      params: {
        groupId: `${groupId}`,
      },
    })),
    */
    fallback: true, // if not statically generated, try to confirm if there is a new category
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    axios.defaults.baseURL = ESI_BASE_URL;
    const groupId = Number(context.params?.groupId as string);

    // check if the requested group exists
    const firstPage = await getUniverseGroups();
    let groupIds = [...firstPage.data];
    const numPages = firstPage.headers["x-pages"];
    for (let page = 2; page <= numPages; page++) {
      const result = await getUniverseGroups({ page });
      groupIds = [...groupIds, ...result.data];
    }
    if (!groupIds.includes(groupId)) {
      return {
        notFound: true,
      };
    }

    // get info about the group
    const group = await getUniverseGroupsGroupId(groupId);
    // get info about its groups
    const types = await Promise.all(
      group.data.types.map((typeId) => getUniverseTypesTypeId(typeId)),
    );

    return {
      props: {
        name: group?.data?.name,
        types: (types ?? []).map((response) => ({
          type_id: response.data.type_id,
          name: response.data.name,
        })),
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
      revalidate: 3600, // every hour
    };
  }
};

export default function Page({ name, types }: PageProps) {
  const router = useRouter();
  const groupId = router.query.groupId as string;
  const { data: group } = useGetUniverseGroupsGroupId(parseInt(groupId));

  if (router.isFallback) {
    return (
      <Group>
        <Loader />
        <Text>Loading type information...</Text>
      </Group>
    );
  }

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
              <Group wrap="nowrap" key={type.type_id}>
                <TypeAvatar typeId={type.type_id} size="sm" />
                <TypeAnchor typeId={type.type_id}>
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
