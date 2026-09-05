import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import WalletPageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Wallet",
  description:
    "Browse your EVE Online character and corporation wallet journals in one place.",
  path: "/wallet",
  badge: "Wallet",
});

export default function Page() {
  // The owner selection lives in the URL via nuqs, which reads useSearchParams
  // internally — without a Suspense boundary the route silently drops out of
  // static prerendering under cacheComponents.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WalletPageClient />
    </Suspense>
  );
}
