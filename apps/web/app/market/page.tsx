import { Group, Stack, Text, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

import { ShowMarketTreeInline } from "~/layouts";
import { pageMetadata } from "~/lib/metadata";

export const metadata = pageMetadata({
  title: "Market",
  description:
    "Browse EVE Online market data — prices, orders, and trade hubs across New Eden.",
  path: "/market",
  badge: "Market",
});

export default function Page() {
  return (
    <Stack gap="md">
      {/* The layout's sidebar tree is this page's content on small screens. */}
      <ShowMarketTreeInline />
      <Group wrap="nowrap">
        <MarketIcon width={48} />
        <Title order={1}>Market</Title>
      </Group>
      <Text c="dimmed">
        Browse the market groups, or search for an item, to see its buy and sell
        orders across New Eden.
      </Text>
    </Stack>
  );
}
