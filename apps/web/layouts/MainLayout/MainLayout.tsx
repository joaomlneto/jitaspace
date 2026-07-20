"use client";

import type { AppShellProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { AppShell, Box, rem, useMantineTheme } from "@mantine/core";
import { useHeadroom } from "@mantine/hooks";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { HeaderMenu } from "~/layouts/MainLayout/HeaderMenu";
import { MobileTabBar } from "~/layouts/MainLayout/MobileTabBar";

export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  const { pinned } = useHeadroom({ fixedAt: 120 });
  const theme = useMantineTheme();
  const appBackground = theme.other.appBackground;
  return (
    <AppShell
      header={{
        height: 60,
        collapsed: !pinned,
        offset: true,
      }}
      footer={{
        // Below sm: the mobile tab bar. From sm: the footer links.
        height: { base: 64, sm: 60 },
        offset: true,
      }}
      style={appBackground ? { background: appBackground } : undefined}
      {...otherProps}
    >
      <AppShell.Header>
        <HeaderMenu />
      </AppShell.Header>
      <AppShell.Main
        // The header overlaps the status-bar inset in standalone mode (its
        // height is grown in globals.css but the layout offset isn't), so add
        // the top inset here to keep content clear of the notch.
        pt={`calc(${rem(60)} + var(--mantine-spacing-xs) + env(safe-area-inset-top))`}
        pb={`calc(${rem(60)} + var(--mantine-spacing-xs))`}
      >
        {children}
      </AppShell.Main>
      <AppShell.Footer>
        <Box hiddenFrom="sm" h="100%">
          <MobileTabBar />
        </Box>
        <Box visibleFrom="sm" h="100%">
          <FooterWithLinks />
        </Box>
      </AppShell.Footer>
    </AppShell>
  );
}
