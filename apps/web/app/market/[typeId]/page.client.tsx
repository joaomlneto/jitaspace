"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import posthog from "posthog-js";

import type { RegionalMarketOrder } from "@jitaspace/hooks";
import { TypeAvatar } from "@jitaspace/eve-components";
import { useTypeMarketOrders } from "@jitaspace/hooks";

import {
  formatIsk,
  MarketOrdersDataTable,
  OrderLocation,
} from "~/components/Market";
import { BrowseMarketButton } from "~/layouts";

const MARKET_TABS = ["sell", "buy", "history"] as const;

/**
 * Recharts is only needed once the history tab opens, so it is not part of
 * the bundle every market page loads for its order tables.
 */
const MarketPriceHistory = dynamic(
  () =>
    import("~/components/Market/MarketPriceHistory").then(
      (module) => module.MarketPriceHistory,
    ),
  { ssr: false, loading: () => <Skeleton h={560} /> },
);

/** A tab label that drops its second word where three tabs would not fit. */
function TabLabel({ short, rest }: Readonly<{ short: string; rest: string }>) {
  return (
    <>
      {short}
      <Box component="span" visibleFrom="xs">
        {` ${rest}`}
      </Box>
    </>
  );
}

export interface MarketTypePageProps {
  typeId: number;
  /** Resolved server-side so crawlers and the first render see the item name. */
  typeName: string;
}

/** The cheapest sell order, or the highest-paying buy order. */
function bestOrder(
  orders: RegionalMarketOrder[],
  isBetter: (price: number, best: number) => boolean,
): RegionalMarketOrder | undefined {
  let best: RegionalMarketOrder | undefined;
  for (const order of orders) {
    if (!best || isBetter(order.price, best.price)) best = order;
  }
  return best;
}

/**
 * The best price on one side of the market, and where it is. No spread: the
 * two best orders are usually regions apart, so their difference says nothing
 * a trader can act on (Tritanium's came out at -235%).
 */
function BestPrice({
  label,
  order,
  isLoading,
}: Readonly<{
  label: string;
  order?: RegionalMarketOrder;
  isLoading: boolean;
}>) {
  return (
    <Paper withBorder p="sm" radius="md" miw={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      {/* Skeletons sized like the loaded text, so nothing shifts on arrival. */}
      <Skeleton visible={isLoading}>
        <Text fw={700} size="lg" truncate>
          {order ? formatIsk(order.price) : "No orders"}
        </Text>
      </Skeleton>
      <Skeleton visible={isLoading} mt={4}>
        <Text size="xs" component="div" mih={20}>
          {order && <OrderLocation order={order} />}
        </Text>
      </Skeleton>
    </Paper>
  );
}

export default function MarketTypePage({
  typeId,
  typeName,
}: Readonly<MarketTypePageProps>) {
  const { data, isLoading } = useTypeMarketOrders(typeId);
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(MARKET_TABS).withDefault("sell"),
  );

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
  const bestSell = useMemo(
    () => bestOrder(sellOrders, (price, best) => price < best),
    [sellOrders],
  );
  const bestBuy = useMemo(
    () => bestOrder(buyOrders, (price, best) => price > best),
    [buyOrders],
  );

  return (
    <Stack gap="lg">
      <BrowseMarketButton />
      <Group justify="space-between" align="center" gap="sm">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <TypeAvatar typeId={typeId} size="md" />
          <Title order={1} lineClamp={2}>
            {typeName}
          </Title>
        </Group>
        <Anchor component={Link} href={`/type/${typeId}`} size="sm">
          Item info
        </Anchor>
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <BestPrice label="Lowest sell" order={bestSell} isLoading={isLoading} />
        <BestPrice label="Highest buy" order={bestBuy} isLoading={isLoading} />
      </SimpleGrid>

      <Tabs
        value={tab}
        onChange={(value) => {
          const next = MARKET_TABS.find((candidate) => candidate === value);
          if (next) void setTab(next);
        }}
      >
        <Tabs.List grow>
          <Tabs.Tab
            value="sell"
            rightSection={
              <Badge size="sm" variant="light">
                {isLoading ? "…" : sellOrders.length.toLocaleString()}
              </Badge>
            }
          >
            <TabLabel short="Sell" rest="orders" />
          </Tabs.Tab>
          <Tabs.Tab
            value="buy"
            rightSection={
              <Badge size="sm" variant="light">
                {isLoading ? "…" : buyOrders.length.toLocaleString()}
              </Badge>
            }
          >
            <TabLabel short="Buy" rest="orders" />
          </Tabs.Tab>
          <Tabs.Tab value="history">
            <TabLabel short="Price" rest="history" />
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="sell" pt="md">
          <MarketOrdersDataTable
            orders={sellOrders}
            sortPriceDescending={false}
            isLoading={isLoading}
          />
        </Tabs.Panel>
        <Tabs.Panel value="buy" pt="md">
          <MarketOrdersDataTable
            orders={buyOrders}
            sortPriceDescending={true}
            isLoading={isLoading}
          />
        </Tabs.Panel>
        <Tabs.Panel value="history" pt="md">
          {/* Mounted only while open: it fetches, and a chart can't measure
              its width inside a hidden panel anyway. */}
          {tab === "history" && <MarketPriceHistory typeId={typeId} />}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
