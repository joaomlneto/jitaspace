import type { ReactNode } from "react";

import { MarketLayout } from "~/layouts";

export default function MarketRouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <MarketLayout>{children}</MarketLayout>;
}
