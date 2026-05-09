import type { PropsWithChildren } from "react";

import { MarketGroupsNavigation } from "~/components/Market/MarketGroupsNavigation";

import { MarketLayoutShell } from "./MarketLayoutShell";

export const MarketLayout = ({ children }: PropsWithChildren) => {
  return (
    <MarketLayoutShell sidebar={<MarketGroupsNavigation />}>
      {children}
    </MarketLayoutShell>
  );
};
