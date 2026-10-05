import { Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

/*
 * Kept apart from MarketPriceHistory, and free of Recharts, so the market page
 * can show it while that component's chunk loads without bundling the charts.
 */

export const PRICE_CHART_HEIGHT = 300;
export const VOLUME_CHART_HEIGHT = 120;

/** The summary tiles and both charts, at their loaded size. */
export function PriceHistoryBodySkeleton() {
  return (
    <Stack gap="md">
      <SimpleGrid cols={3} spacing={{ base: 6, sm: "sm" }}>
        <Skeleton h={78} />
        <Skeleton h={78} />
        <Skeleton h={78} />
      </SimpleGrid>
      <Skeleton h={PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + 48} />
    </Stack>
  );
}

/**
 * The whole tab while its code loads: the region and range controls (which
 * wrap onto two rows on a phone, as the real ones do) above the body.
 */
export function MarketPriceHistorySkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm">
        <Skeleton h={36} w={{ base: "100%", xs: 260 }} />
        <Skeleton h={30} w={180} />
      </Group>
      <PriceHistoryBodySkeleton />
    </Stack>
  );
}
