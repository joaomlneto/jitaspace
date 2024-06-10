import type { ReactElement } from "react";
import React, { useMemo } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { Container, Group, Loader, Stack, Text, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { MarketIcon } from "@jitaspace/eve-icons";
import { useTypeMarketOrders } from "@jitaspace/hooks";
import { TypeAvatar, TypeName } from "@jitaspace/ui";

import { MarketOrdersDataTable } from "~/components/Market";
import { MarketLayout } from "~/layouts";

type PageProps = {
  marketGroups: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  >;
  rootMarketGroupIds: number[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const typeIdParam = context.params?.typeId;

    const marketGroups = await prisma.marketGroup.findMany({
      select: {
        marketGroupId: true,
        name: true,
        parentMarketGroupId: true,
        children: {
          select: {
            marketGroupId: true,
          },
        },
        types: {
          select: {
            typeId: true,
            name: true,
          },
        },
      },
    });

    const marketGroupsIndex: Record<
      number,
      {
        name: string;
        parentMarketGroupId: number | null;
        childrenMarketGroupIds: number[];
        types: { typeId: number; name: string }[];
      }
    > = {};
    marketGroups.forEach(
      (marketGroup) =>
        (marketGroupsIndex[marketGroup.marketGroupId] = {
          name: marketGroup.name,
          parentMarketGroupId: marketGroup.parentMarketGroupId,
          childrenMarketGroupIds: marketGroup.children.map(
            (marketGroup) => marketGroup.marketGroupId,
          ),
          types: marketGroup.types.map((type) => type),
        }),
    );

    const rootMarketGroupIds = marketGroups
      .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((marketGroup) => marketGroup.marketGroupId);

    return {
      props: {
        marketGroups: marketGroupsIndex,
        rootMarketGroupIds,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // 30 seconds on error
    };
  }
};

export default function Page({ marketGroups, rootMarketGroupIds }: PageProps) {
  const router = useRouter();
  const typeId = router.query.typeId
    ? Number(router.query.typeId as string)
    : undefined;
  const { data } = useTypeMarketOrders(typeId);

  const mergedRegionalOrders = useMemo(() => {
    return Object.values(data).flat();
  }, [data]);

  const buyOrders = useMemo(
    () => mergedRegionalOrders.filter((order) => order.is_buy_order),
    [mergedRegionalOrders],
  );

  const sellOrders = useMemo(
    () => mergedRegionalOrders.filter((order) => !order.is_buy_order),
    [mergedRegionalOrders],
  );

  // TODO FIXME: Resolve location without causing errors (private structures)

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading market data</Text>
        </Group>
      </Container>
    );
  }

  return (
    <MarketLayout
      marketGroups={marketGroups}
      rootMarketGroupIds={rootMarketGroupIds}
    >
      <Container size="xl">
        <Stack gap="xl">
          <Group>
            <MarketIcon width={48} />
            <Title order={1}>Market</Title>
          </Group>
          <Group>
            <Container>
              {typeId && (
                <Stack>
                  <Group>
                    <TypeAvatar typeId={typeId} size="md" />
                    <Title>
                      <TypeName inherit span typeId={typeId} />
                    </Title>
                  </Group>
                  <Title order={3}>Sell Orders</Title>
                  <MarketOrdersDataTable
                    orders={sellOrders}
                    sortPriceDescending={false}
                  />
                  <Title order={3}>Buy Orders</Title>
                  <MarketOrdersDataTable
                    orders={buyOrders}
                    sortPriceDescending={true}
                  />
                </Stack>
              )}
            </Container>
          </Group>
        </Stack>
      </Container>
    </MarketLayout>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  // FIXME: Should have MarketLayout wrapping it here!
  return page;
};
