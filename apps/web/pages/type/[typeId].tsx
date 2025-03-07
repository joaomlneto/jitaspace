import type { ReactElement } from "react";
import React, { useState } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Spoiler,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { HttpStatusCode } from "axios";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import {
  useFuzzworkTypeMarketStats,
  useMarketPrices,
  useSelectedCharacter,
  useType,
} from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  ISKAmount,
  OpenMarketWindowActionIcon,
  TypeAvatar,
  TypeInventoryBreadcrumbs,
  TypeMarketBreadcrumbs,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

type PageProps = {
  typeId: number;
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
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
    const typeId = Number(context.params?.typeId as string);

    const type = await prisma.type.findUniqueOrThrow({
      select: {
        typeId: true,
        name: true,
        description: true,
      },
      where: {
        typeId: typeId,
      },
    });

    const typeImageVariations: string[] = typeId
      ? ((await fetch(`https://images.evetech.net/types/${typeId}`).then(
          (res) => {
            return res.status === HttpStatusCode.NotFound ? [] : res.json();
          },
        )) as string[])
      : [];

    const variation: string | undefined =
      !typeImageVariations || typeImageVariations?.includes("icon")
        ? "icon"
        : typeImageVariations[0];

    return {
      props: {
        typeId,
        ogImageUrl: `https://images.evetech.net/types/${typeId}/${variation}`,
        typeName: type.name,
        typeDescription: type.description,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // at most once per hour
    };
  }
};

export default function Page({
  typeId,
  ogImageUrl,
  typeName,
  typeDescription,
}: PageProps) {
  const router = useRouter();
  const character = useSelectedCharacter();
  const { data: type } = useType(typeId);
  const { data: marketPrices } = useMarketPrices();
  const [regionId, setRegionId] = useState(10000002);
  const { data: marketStats } = useFuzzworkTypeMarketStats(typeId, regionId);

  if (!typeId || router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading type information...</Text>
        </Group>
      </Container>
    );
  }

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
          <Group gap="xl">
            <TypeAvatar typeId={typeId} size="lg" />
            <Title order={1}>{typeName}</Title>
            {character && (
              <OpenMarketWindowActionIcon
                characterId={character.characterId}
                typeId={typeId}
              />
            )}
          </Group>
          <Stack gap={0}>
            <TypeInventoryBreadcrumbs typeId={typeId} />
            <TypeMarketBreadcrumbs typeId={typeId} />
          </Stack>
          <Group>
            <Link
              href={`https://www.everef.net/type/${typeId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group gap="xs">
                  <IconExternalLink size={14} />
                  Eve Ref
                </Group>
              </Button>
            </Link>
            <Link
              href={`https://evetycoon.com/market/${typeId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group gap="xs">
                  <IconExternalLink size={14} />
                  EVE Tycoon
                </Group>
              </Button>
            </Link>
          </Group>
          {type?.data.description && (
            <Spoiler
              maxHeight={120}
              showLabel="Show more"
              hideLabel="Show less"
            >
              <MailMessageViewer
                content={
                  type.data.description
                    ? sanitizeFormattedEveString(type.data.description)
                    : "No description"
                }
              />
            </Spoiler>
          )}
          {marketPrices[typeId] && (
            <>
              <Group justify="space-between">
                <Text>Average Price</Text>
                <Text>
                  {marketPrices[typeId]?.average_price?.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}{" "}
                  ISK
                </Text>
              </Group>
              <Group justify="space-between">
                <Text>Adjusted Price</Text>
                <Text>
                  {marketPrices[typeId]?.adjusted_price?.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}{" "}
                  ISK
                </Text>
              </Group>
              {marketStats && (
                <>
                  <Title order={6}>
                    Market Statistics (powered by{" "}
                    <Anchor href="https://www.fuzzwork.co.uk" target="_blank">
                      fuzzwork.co.uk
                    </Anchor>
                    )
                  </Title>
                  <Group justify="space-between">
                    <Text>Jita Buy</Text>
                    <Text>
                      <ISKAmount amount={marketStats.buy.percentile} />
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Jita Split</Text>
                    <Text>
                      <ISKAmount
                        amount={
                          (marketStats.buy.percentile +
                            marketStats.sell.percentile) /
                          2
                        }
                      />
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Jita Sell</Text>
                    <Text>
                      <ISKAmount amount={marketStats.sell.percentile} />
                    </Text>
                  </Group>
                </>
              )}
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};
