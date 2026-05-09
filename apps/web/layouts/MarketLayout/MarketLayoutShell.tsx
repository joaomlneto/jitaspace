"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { Suspense } from "react";
import { Box, Flex, Loader, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface MarketLayoutShellProps extends PropsWithChildren {
  sidebar: ReactNode;
}

export const MarketLayoutShell = ({
  children,
  sidebar,
}: MarketLayoutShellProps) => {
  const matches = useMediaQuery("(max-width: 48em)");

  return (
    <Flex gap="lg" align="flex-start" direction={matches ? "column" : "row"}>
      <Box w={matches ? "100%" : 350} style={{ flexShrink: 0 }}>
        <ScrollArea h={matches ? 320 : "calc(100vh - 180px)"}>
          <Suspense fallback={<Loader />}>{sidebar}</Suspense>
        </ScrollArea>
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Flex>
  );
};
