import React, { useMemo, type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  AppShell,
  Box,
  Container,
  Group,
  Loader,
  Navbar,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { useTypeMarketOrders } from "@jitaspace/esi-hooks";
import { MarketIcon } from "@jitaspace/eve-icons";
import { TypeAvatar, TypeName } from "@jitaspace/ui";

import { MarketGroupNavLink, MarketOrdersDataTable } from "~/components/Market";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";

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
      .toSorted((a, b) => a.name.localeCompare(b.name))
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
      revalidate: 30, // 30 seconds on error
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

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading market data for</Text>
          <TypeName span typeId={typeId} />
        </Group>
      </Container>
    );
  }
  return (
    <Container size="xl">
      <AppShell
        padding="md"
        fixed={false}
        navbar={
          <Navbar width={{ base: 300 }} height={500} p="xs">
            {rootMarketGroupIds?.map((marketGroupId) => (
              <MarketGroupNavLink
                marketGroups={marketGroups}
                marketGroupId={marketGroupId}
                key={marketGroupId}
              />
            ))}
          </Navbar>
        }
      >
        {/* Your application here */}
        <Stack spacing="xl">
          <Group>
            <MarketIcon width={48} />
            <Title order={1}>Market</Title>
          </Group>
          <Group>
            {false && (
              <Box w={320}>
                {rootMarketGroupIds?.map((marketGroupId) => (
                  <MarketGroupNavLink
                    marketGroups={marketGroups}
                    marketGroupId={marketGroupId}
                    key={marketGroupId}
                  />
                ))}
              </Box>
            )}
            <Container>
              {typeId && (
                <Stack>
                  <Group>
                    <TypeAvatar typeId={typeId} size="md" />
                    <Title>
                      <TypeName span typeId={typeId} />
                    </Title>
                  </Group>
                  {env.NODE_ENV !== "production" && (
                    <Text>
                      TODO: Resolve location without causing errors (private
                      structures).
                    </Text>
                  )}
                  <Title order={3}>Sell Orders</Title>
                  <MarketOrdersDataTable orders={sellOrders} />
                  <Title order={3}>Buy Orders</Title>
                  <MarketOrdersDataTable orders={buyOrders} />
                </Stack>
              )}
            </Container>
          </Group>
        </Stack>
      </AppShell>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
