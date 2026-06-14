import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

export const metadata = {
  title: "Market",
  description:
    "Browse EVE Online market data — prices, orders, and trade hubs across New Eden.",
};

export default function Page() {
  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group>
          <MarketIcon width={48} />
          <Title order={1}>Market</Title>
        </Group>
        <Text c="dimmed">
          Select an item from the market groups to view its buy and sell orders.
        </Text>
      </Stack>
    </Container>
  );
}
