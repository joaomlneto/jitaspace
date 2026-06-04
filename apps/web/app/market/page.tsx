import { Suspense } from "react";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

export const metadata = {
  title: "Market",
  description:
    "Browse EVE Online market data — prices, orders, and trade hubs across New Eden.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
