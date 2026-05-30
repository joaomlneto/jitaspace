"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";
import { useTypeMarketOrders } from "@jitaspace/hooks";
import { TypeAvatar, TypeName } from "@jitaspace/ui";

import { MarketOrdersDataTable } from "~/components/Market";
export default function Page() {
  // Every /market/<typeId> URL is rewritten to this single static /market shell
  // (see next.config.mjs), so there is no route param to read — we derive the
  // selected type from the browser path instead. Gating on `mounted` keeps the
  // first client render identical to the static server shell (typeId undefined),
  // avoiding a hydration mismatch; the id is applied right after mount and on
  // subsequent client-side navigation between items.
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const typeId = useMemo(() => {
    if (!mounted) return undefined;
    const match = pathname?.match(/^\/market\/(\d+)/);
    return match ? Number(match[1]) : undefined;
  }, [mounted, pathname]);

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
