import React, { type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import axios, { HttpStatusCode } from "axios";
import { NextSeo } from "next-seo";

import {
  getUniverseTypes,
  getUniverseTypesTypeId,
  useGetUniverseTypesTypeId,
} from "@jitaspace/esi-client";
import { useMarketPrices } from "@jitaspace/esi-hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  OpenMarketWindowActionIcon,
  TypeAvatar,
  TypeInventoryBreadcrumbs,
  TypeMarketBreadcrumbs,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { ESI_BASE_URL } from "~/config/constants";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";

type PageProps = {
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  // FIXME: THIS SHOULD NOT BE NEEDED
  axios.defaults.baseURL = ESI_BASE_URL;

  // When this is true (in preview environments) don't prerender any static pages
  // (faster builds, but slower initial page load)
  if (env.SKIP_BUILD_STATIC_GENERATION === "true") {
    return {
      paths: [],
      fallback: "blocking",
    };
  }

  // Get list of typeIDs from ESI
  const firstPage = await getUniverseTypes();
  let typeIds = [...firstPage.data];
  // FIXME: THE FOLLOWING IS COMMENTED WHILE I SORT OUT GIGANTIC BUILD TIMES ON CICD
  /*
  const numPages = firstPage.headers["x-pages"];
  for (let page = 2; page <= numPages; page++) {
    const result = await getUniverseTypes({ page });
    typeIds = [...typeIds, ...result.data];
  }
  */

  return {
    paths: typeIds.map((typeId) => ({
      params: {
        typeId: `${typeId}`,
      },
    })),
    fallback: true, // if not statically generated, try to confirm if there is a new type
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    axios.defaults.baseURL = ESI_BASE_URL;
    const typeId = Number(context.params?.typeId as string);

    // check if the requested type exists
    const typeIds = await getUniverseTypes();
    if (!typeIds.data.includes(typeId)) {
      return {
        notFound: true,
      };
    }

    // FIXME: these two calls should be made in parallel, not sequentially
    const typeInfo = await getUniverseTypesTypeId(typeId);
    const typeImageVariations: string[] = typeId
      ? ((await fetch(`https://images.evetech.net/types/${typeId}`).then(
          (res) => {
            return res.status === HttpStatusCode.NotFound ? [] : res.json();
          },
        )) as string[])
      : [];
    const ogVariation: string | undefined =
      !typeImageVariations || typeImageVariations?.includes("render")
        ? "render"
        : typeImageVariations[0];
    return {
      props: {
        ogImageUrl: `https://images.evetech.net/types/${typeId}/${ogVariation}`,
        typeName: typeInfo?.data?.name,
        typeDescription: typeInfo?.data?.description,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
    };
  }
};

export default function Page({
  ogImageUrl,
  typeName,
  typeDescription,
}: PageProps) {
  const router = useRouter();
  const typeId = router.query.typeId as string;
  const { data: type } = useGetUniverseTypesTypeId(parseInt(typeId));
  const { data: marketPrices } = useMarketPrices();

  return (
    <>
      <NextSeo
        title={typeName}
        openGraph={{
          type: "article",
          title: typeName,
          description: typeDescription,
          url: `https://www.jita.space/type/${typeId}`,
          images: ogImageUrl
            ? [
                {
                  type: "image/png",
                  alt: type?.data.name ?? `Type ${typeId}`,
                  width: 64,
                  height: 64,
                  url: ogImageUrl,
                  secureUrl: ogImageUrl,
                },
              ]
            : [],
          siteName: "Jita",
        }}
        twitter={{
          cardType: "summary",
          site: `https://www.jita.space/type/${typeId}`,
        }}
        themeColor="#9bb4d0"
      />
      <Container size="sm">
        <Stack>
          <Group spacing="xl">
            <TypeAvatar typeId={typeId} size="lg" />
            <Title order={1}>{typeName}</Title>
            <OpenMarketWindowActionIcon typeId={typeId} />
          </Group>
          <Stack spacing={0}>
            <TypeInventoryBreadcrumbs typeId={typeId} />
            <TypeMarketBreadcrumbs typeId={typeId} />
          </Stack>
          <Group>
            <Link
              href={`https://www.everef.net/type/${typeId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group spacing="xs">
                  <IconExternalLink size={14} />
                  Eve Ref
                </Group>
              </Button>
            </Link>
            <Link
              href={`https://evemarketer.com/types/${typeId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group spacing="xs">
                  <IconExternalLink size={14} />
                  Eve Marketer
                </Group>
              </Button>
            </Link>
            <Link
              href={`https://evetycoon.com/market/${typeId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group spacing="xs">
                  <IconExternalLink size={14} />
                  EVE Tycoon
                </Group>
              </Button>
            </Link>
          </Group>
          {type?.data.description && (
            <MailMessageViewer
              content={
                type.data.description
                  ? sanitizeFormattedEveString(type.data.description)
                  : "No description"
              }
            />
          )}
          {marketPrices[typeId] && (
            <>
              <Group position="apart">
                <Text>Average Price</Text>
                <Text>
                  {marketPrices[typeId]?.average_price?.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}{" "}
                  ISK
                </Text>
              </Group>
              <Group position="apart">
                <Text>Adjusted Price</Text>
                <Text>
                  {marketPrices[typeId]?.adjusted_price?.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}{" "}
                  ISK
                </Text>
              </Group>
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
