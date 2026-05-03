"use client";

import type { PropsWithChildren } from "react";
import { Box, Flex, Loader, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { MarketGroupNavLink } from "~/components/Market";

export interface MarketLayoutProps extends PropsWithChildren {
  marketGroups?: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  >;
  rootMarketGroupIds?: number[];
}

export const MarketLayout = ({
  children,
  marketGroups,
  rootMarketGroupIds,
}: MarketLayoutProps) => {
  const matches = useMediaQuery("(max-width: 48em)");

  return (
    <Flex gap="lg" align="flex-start" direction={matches ? "column" : "row"}>
      <Box w={matches ? "100%" : 350} style={{ flexShrink: 0 }}>
        <ScrollArea h={matches ? 320 : "calc(100vh - 180px)"}>
          {!marketGroups && <Loader />}
          {marketGroups &&
            rootMarketGroupIds?.map((marketGroupId) => (
              <MarketGroupNavLink
                marketGroups={marketGroups}
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
