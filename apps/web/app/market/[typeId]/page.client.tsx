"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";

import { useTypeMarketOrders } from "@jitaspace/hooks";
import { TypeAvatar } from "@jitaspace/ui";

import { MarketOrdersDataTable } from "~/components/Market";

export interface MarketTypePageProps {
  typeId: number;
  /** Resolved server-side so the heading renders immediately, without a shift. */
  typeName: string;
}

export default function MarketTypePage({
  typeId,
  typeName,
}: MarketTypePageProps) {
  const { data } = useTypeMarketOrders(typeId);

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

  // TODO FIXME: Resolve location without causing errors (private structures)

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
          />
          <Title order={3}>Buy Orders</Title>
          <MarketOrdersDataTable
            orders={buyOrders}
            sortPriceDescending={true}
          />
        </Stack>
      </Stack>
    </Container>
  );
}
