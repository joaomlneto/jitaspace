import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export const metadata = {
  title: "Market",
  description:
    "Browse EVE Online market data — prices, orders, and trade hubs across New Eden.",
};

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
