"use client";

import React, { type PropsWithChildren } from "react";
import { AppShell, rem, type AppShellProps } from "@mantine/core";
import { useHeadroom, useMediaQuery } from "@mantine/hooks";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { HeaderWithMegaMenus } from "~/layouts/MainLayout/HeaderWithMegaMenus";


export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  const matches = useMediaQuery("(max-width: 48em)");
  const pinned = useHeadroom({ fixedAt: 120 });
  return (
    <AppShell
      header={{
        height: 60,
        collapsed: !pinned,
        offset: true,
      }}
      footer={{
        height: { base: 80, xs: 60 },
        offset: true,
        collapsed: matches && !pinned,
      }}
      {...otherProps}
    >
      <AppShell.Header>
        <HeaderWithMegaMenus pinned={pinned} />
      </AppShell.Header>
      <AppShell.Main py={`calc(${rem(60)} + var(--mantine-spacing-xs))`}>
        {children}
      </AppShell.Main>
      <AppShell.Footer>
        <FooterWithLinks />
      </AppShell.Footer>
    </AppShell>
  );
}
