"use client";

import type { PropsWithChildren } from "react";
import { Box, Flex, Loader, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import type { MarketGroupsApiResponseBody } from "~/pages/api/market-groups";
import { MarketGroupNavLink } from "~/components/Market";
import { CONFIG } from "~/config/constants.ts";

export type MarketLayoutProps = PropsWithChildren;

export const MarketLayout = ({ children }: MarketLayoutProps) => {
  const matches = useMediaQuery("(max-width: 48em)");

  const marketGroupsRes = useQuery({
    queryKey: [`${CONFIG.SITE_URL}/api/market-groups`],
    queryFn: () =>
      fetch("/api/market-groups").then(
        (res) => res.json() as Promise<MarketGroupsApiResponseBody>,
      ),
  });

  return (
    <Flex gap="lg" align="flex-start" direction={matches ? "column" : "row"}>
      <Box w={matches ? "100%" : 350} style={{ flexShrink: 0 }}>
        <ScrollArea h={matches ? 320 : "calc(100vh - 180px)"}>
          {!marketGroupsRes.data?.marketGroups && <Loader />}
          {marketGroupsRes.data?.marketGroups &&
            marketGroupsRes.data?.rootMarketGroupIds?.map((marketGroupId) => (
              <MarketGroupNavLink
                marketGroups={marketGroupsRes.data?.marketGroups}
                marketGroupId={marketGroupId}
                key={marketGroupId}
              />
            ))}
        </ScrollArea>
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Flex>
  );
};
