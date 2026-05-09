"use client";

import _React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";
import { useTypeMarketOrders } from "@jitaspace/hooks";
import { TypeAvatar, TypeName } from "@jitaspace/ui";

import { MarketOrdersDataTable } from "~/components/Market";
export default function Page() {
  const params = useParams();
  const rawTypeId = params?.typeId;
  const typeIdRaw = typeof rawTypeId === "string" ? rawTypeId : rawTypeId?.[0];
  const typeId = typeIdRaw ? Number(typeIdRaw) : undefined;
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

  return (
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
  );
}
