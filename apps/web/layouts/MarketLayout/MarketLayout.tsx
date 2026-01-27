import type { AppShellProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { AppShell, Loader, rem, ScrollArea } from "@mantine/core";
import { useHeadroom, useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import type { MarketGroupsApiResponseBody } from "~/pages/api/market-groups";
import { MarketGroupNavLink } from "~/components/Market";
import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { HeaderWithMegaMenus } from "~/layouts/MainLayout/HeaderWithMegaMenus";

export type MarketLayoutProps = PropsWithChildren<AppShellProps>;

export const MarketLayout = ({
  children,
  ...otherProps
}: MarketLayoutProps) => {
  const matches = useMediaQuery("(max-width: 48em)");
  const pinned = useHeadroom({ fixedAt: 120 });

  const marketGroupsRes = useQuery({
    queryKey: ["https://www.jita.space/api/market-groups"],
    queryFn: () =>
      fetch("/api/market-groups").then(
        (res) => res.json() as Promise<MarketGroupsApiResponseBody>,
      ),
  });

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
          {!marketGroupsRes.data?.marketGroups && <Loader />}
          {marketGroupsRes.data?.marketGroups &&
            marketGroupsRes.data?.rootMarketGroupIds?.map((marketGroupId) => (
              <MarketGroupNavLink
                marketGroups={marketGroupsRes.data?.marketGroups}
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
