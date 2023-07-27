import React, { type ReactElement } from "react";
import { type GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import axios, { HttpStatusCode } from "axios";
import { NextSeo } from "next-seo";

import {
  getUniverseTypesTypeId,
  useGetUniverseTypesTypeId,
  useMarketPrices,
} from "@jitaspace/esi-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  OpenMarketWindowActionIcon,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context,
) => {
  try {
    axios.defaults.baseURL = ESI_BASE_URL;
    const typeId = context.params?.typeId as string;
    // FIXME: these two calls should be made in parallel, not sequentially
    const typeInfo = await getUniverseTypesTypeId(parseInt(typeId));
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
    context.res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=3600",
    );
    return {
      props: {
        ogImageUrl: `https://images.evetech.net/types/${typeId}/${ogVariation}`,
        typeName: typeInfo?.data?.name,
        typeDescription: typeInfo?.data?.description,
      },
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
          site: "https://www.jita.space/type/${typeId}",
        }}
        themeColor="#9bb4d0"
      />
      <Container size="sm">
        <Stack>
          <Group spacing="xl">
            <TypeAvatar typeId={typeId} size="xl" radius={256} />
            <Title order={3}>
              <TypeName span typeId={typeId} />
            </Title>
            <OpenMarketWindowActionIcon typeId={typeId} />
          </Group>
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
