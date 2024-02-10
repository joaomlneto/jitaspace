import React, { PropsWithChildren } from "react";
import { AppShell, AppShellProps, rem, ScrollArea } from "@mantine/core";
import { useHeadroom, useMediaQuery } from "@mantine/hooks";

import { MarketGroupNavLink } from "~/components/Market";
import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { HeaderWithMegaMenus } from "~/layouts/MainLayout/HeaderWithMegaMenus";


export type MarketLayoutProps = PropsWithChildren<AppShellProps> & {
  marketGroups: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  >;
  rootMarketGroupIds: number[];
};

export const MarketLayout = ({
  marketGroups,
  rootMarketGroupIds,
  children,
  ...otherProps
}: MarketLayoutProps) => {
  const matches = useMediaQuery("(max-width: 48em)");
  const pinned = useHeadroom({ fixedAt: 120 });
  return (
    <AppShell
      header={{
        height: 60,
        collapsed: !pinned,
        offset: true,
      }}
      navbar={{
        width: 350,
        breakpoint: "sm",
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
      <AppShell.Navbar>
        <AppShell.Section grow component={ScrollArea}>
          {rootMarketGroupIds?.map((marketGroupId) => (
            <MarketGroupNavLink
              marketGroups={marketGroups}
              marketGroupId={marketGroupId}
              key={marketGroupId}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Footer>
        <FooterWithLinks />
      </AppShell.Footer>
      <AppShell.Main py={`calc(${rem(60)} + var(--mantine-spacing-xs))`}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};
