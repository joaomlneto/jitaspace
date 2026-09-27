"use client";

import { useEffect, useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import posthog from "posthog-js";

import { TypeAvatar } from "@jitaspace/eve-components";
import { useTypeMarketOrders } from "@jitaspace/hooks";

import { MarketOrdersDataTable } from "~/components/Market";

export interface MarketTypePageProps {
  typeId: number;
  /** Resolved server-side so crawlers and the first render see the item name. */
  typeName: string;
}

export default function MarketTypePage({
  typeId,
  typeName,
}: Readonly<MarketTypePageProps>) {
  const { data, isLoading } = useTypeMarketOrders(typeId);

  useEffect(() => {
    posthog.capture("market_item_viewed", { type_id: typeId });
  }, [typeId]);

  const mergedRegionalOrders = useMemo(
    () => Object.values(data).flat(),
    [data],
  );
  const sellOrders = useMemo(
    () => mergedRegionalOrders.filter((order) => !order.is_buy_order),
    [mergedRegionalOrders],
  );
  const buyOrders = useMemo(
    () => mergedRegionalOrders.filter((order) => order.is_buy_order),
    [mergedRegionalOrders],
  );

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group>
          <TypeAvatar typeId={typeId} size="md" />
          <Title order={1}>{typeName}</Title>
        </Group>
        <Stack>
          <Title order={3}>Sell Orders</Title>
          <MarketOrdersDataTable
            orders={sellOrders}
            sortPriceDescending={false}
            isLoading={isLoading}
          />
          <Title order={3}>Buy Orders</Title>
          <MarketOrdersDataTable
            orders={buyOrders}
            sortPriceDescending={true}
            isLoading={isLoading}
          />
        </Stack>
      </Stack>
    </Container>
  );
}
