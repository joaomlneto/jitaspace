import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export const metadata = {
  title: "Market",
  description:
    "Browse EVE Online market data — prices, orders, and trade hubs across New Eden.",
  // Every URL that rewrites onto this route serves the same document —
  // `/market`, `/market/<typeId>` and `/market-group/<id>` measured
  // byte-identical (md5 89b07000fe4ab0e2d54f65717a3cbe68) on 2026-09-02, and
  // the rendered breadcrumb of all ~53k type pages links a market group, so the
  // duplicates are minted by our own link graph. See the rewrites in
  // `next.config.mjs`.
  //
  // Deliberate trade-off: this forfeits any chance of `/market/<typeId>`
  // ranking for that item. Correct while the server HTML holds nothing
  // item-specific — revisit if market groups ever get a real route.
  alternates: { canonical: "/market" },
};

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
