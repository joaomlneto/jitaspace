import { Group, Stack, Text, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

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
    // Marks the page for the market layout, which lists its own sidebar tree
    // inline below md here instead of hiding it (see MarketLayout.module.css).
    <Stack gap="md" data-market-index>
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
