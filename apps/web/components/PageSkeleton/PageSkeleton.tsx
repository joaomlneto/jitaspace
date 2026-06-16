import type { ContainerProps } from "@mantine/core";
import { Container, Group, Skeleton, Stack } from "@mantine/core";

export interface PageSkeletonProps {
  /**
   * Container width, matched to the page's own `Container` so the swap to real
   * content doesn't shift horizontally. Defaults to `"xl"` — the wide table
   * pages (market, travel, wallet, LP store) where layout shift hurts most.
   */
  size?: ContainerProps["size"];
  /** Number of placeholder content rows to render. */
  rows?: number;
}

/**
 * Height-reserving loading placeholder used as the `Suspense` fallback for route
 * content. Replaces a bare `<Loader />` (a small spinner that reserves no
 * vertical space) so that when the streamed page content arrives it drops into
 * already-reserved layout instead of pushing the page down — keeping Cumulative
 * Layout Shift low both on first paint and on client-side navigation.
 */
export function PageSkeleton({
  size = "xl",
  rows = 8,
}: Readonly<PageSkeletonProps>) {
  const rowKeys = Array.from({ length: rows }, (_, i) => `page-skeleton-${i}`);
  return (
    <Container size={size} role="status" aria-label="Loading">
      <Stack gap="xl" mih="70vh">
        <Group>
          <Skeleton height={48} width={48} radius="md" />
          <Skeleton height={32} width={240} radius="sm" />
        </Group>
        <Stack gap="sm">
          {rowKeys.map((key) => (
            <Skeleton key={key} height={40} radius="sm" />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
