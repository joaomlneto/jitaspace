"use client";

import type { AppShellProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { AppShell, Box, rem, useMantineTheme } from "@mantine/core";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { HeaderMenu } from "~/layouts/MainLayout/HeaderMenu";
import { MobileTabBar } from "~/layouts/MainLayout/MobileTabBar";
import classes from "./MainLayout.module.css";
import { usePinnedHeader } from "./usePinnedHeader";

export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  const pinned = usePinnedHeader({ fixedAt: 120 });
  const theme = useMantineTheme();
  const { appBackground, appBackgroundMobile = appBackground } = theme.other;
  return (
    <AppShell
      header={{
        height: 60,
        collapsed: !pinned,
        offset: true,
      }}
      footer={{
        // The fixed footer is the mobile tab bar, so it is only there below
        // sm. The page footer (FooterWithLinks) is not fixed: it ends the page.
        height: { base: 64, sm: 0 },
        offset: true,
      }}
      {...otherProps}
    >
      {appBackground && (
        <Box
          aria-hidden
          className={classes.background}
          style={{
            "--app-background": appBackground,
            "--app-background-mobile": appBackgroundMobile,
          }}
        />
      )}
      <AppShell.Header>
        <HeaderMenu />
      </AppShell.Header>
      <AppShell.Main
        // The header overlaps the status-bar inset in standalone mode (its
        // height is grown in globals.css but the layout offset isn't), so add
        // the top inset here to keep content clear of the notch.
        pt={`calc(${rem(60)} + var(--mantine-spacing-xs) + env(safe-area-inset-top))`}
        // Clears the tab bar below sm (it is 0 from sm), including the
        // home-indicator inset Mantine adds to the tab bar's height.
        pb="calc(var(--app-shell-footer-offset, 0rem) + env(safe-area-inset-bottom))"
        className={classes.main}
      >
        <div className={classes.content}>{children}</div>
        <FooterWithLinks />
      </AppShell.Main>
      <AppShell.Footer hiddenFrom="sm">
        <MobileTabBar />
      </AppShell.Footer>
    </AppShell>
  );
}
